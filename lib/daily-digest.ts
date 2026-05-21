import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailQuietly } from "./mailer";

type Match = {
  id: number;
  classification: string | null;
  created_at: string;
  medication_items: {
    id: number;
    product_name: string;
    manufacturer: string;
  } | null;
  recalls: {
    recall_number: string;
    reason_for_recall: string | null;
  } | null;
};

export type DigestStats = {
  usersConsidered: number;
  emailsSent: number;
  skipped: number;
  failed: number;
};

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function classChip(c: string | null): string {
  if (!c) return "Unclassified";
  if (/class\s*i\b/i.test(c) && !/class\s*ii/i.test(c)) return "Class I";
  if (/class\s*ii\b/i.test(c) && !/class\s*iii/i.test(c)) return "Class II";
  if (/class\s*iii\b/i.test(c)) return "Class III";
  return c;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function composeMatches(matches: Match[], appUrl: string): { html: string; text: string } {
  const rows = matches
    .filter((m) => m.medication_items && m.recalls)
    .map((m) => {
      const med = m.medication_items!;
      const rec = m.recalls!;
      return {
        product: med.product_name,
        manufacturer: med.manufacturer,
        cls: classChip(m.classification),
        recallNumber: rec.recall_number,
        reason: rec.reason_for_recall ?? "See FDA notice",
      };
    });
  const htmlRows = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">
        <strong>${esc(r.product)}</strong><br/>
        <span style="color:#666">${esc(r.manufacturer)} · ${esc(r.cls)}</span><br/>
        <span style="font-size:13px">${esc(r.reason)}</span><br/>
        <span style="font-size:12px;color:#888">Recall #${esc(r.recallNumber)}</span>
      </td>
    </tr>`,
    )
    .join("");
  const html = `<table style="width:100%;border-collapse:collapse;margin:16px 0">${htmlRows}</table>
  <p><a href="${appUrl}/notifications" style="color:#0a66c2">Review all alerts in your dashboard →</a></p>`;
  const text = rows
    .map(
      (r) =>
        `• ${r.product} (${r.manufacturer}) — ${r.cls}\n  Recall #${r.recallNumber}: ${r.reason}`,
    )
    .join("\n\n");
  return { html, text };
}

function composeDigest(args: {
  userName: string;
  matches: Match[];
  medCount: number;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { userName, matches, medCount, appUrl } = args;
  const safeUser = esc(userName);

  if (matches.length === 0) {
    const subject = "[FDA] Daily check — no recalls found";
    const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 8px;font-size:20px">All clear, ${safeUser}.</h2>
  <p style="margin:0 0 16px">
    We checked your ${medCount} medication${medCount === 1 ? "" : "s"} against the FDA recall
    database today. <strong>No recalls found.</strong>
  </p>
  <p style="font-size:14px;color:#666">
    You&rsquo;ll get this check every day. If something is recalled, you&rsquo;ll see it here first.
  </p>
  <p style="margin-top:24px;font-size:13px;color:#888">
    <a href="${appUrl}/cabinet" style="color:#0a66c2">Manage your cabinet</a> ·
    <a href="${appUrl}/settings/notifications" style="color:#0a66c2">Notification settings</a>
  </p>
</div>`;
    const text = `All clear, ${userName}.

We checked your ${medCount} medication${medCount === 1 ? "" : "s"} against the FDA recall database today. No recalls found.

You'll get this check every day. If something is recalled, you'll see it here first.

Manage your cabinet: ${appUrl}/cabinet`;
    return { subject, html, text };
  }

  const subject = `[FDA] ${matches.length} recall match${matches.length === 1 ? "" : "es"} for your medications`;
  const { html: matchHtml, text: matchText } = composeMatches(matches, appUrl);
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 8px;font-size:20px;color:#b91c1c">
    ${matches.length} medication${matches.length === 1 ? "" : "s"} in your cabinet ${matches.length === 1 ? "has" : "have"} a recall notice
  </h2>
  <p style="margin:0 0 8px">${safeUser},</p>
  <p style="margin:0 0 16px">
    Today&rsquo;s FDA check found the following match${matches.length === 1 ? "" : "es"}:
  </p>
  ${matchHtml}
  <p style="font-size:13px;color:#666">
    Review each match and decide whether to stop the medication. When in doubt, consult your
    pharmacist or physician.
  </p>
  <p style="margin-top:24px;font-size:12px;color:#888">
    <a href="${appUrl}/settings/notifications" style="color:#0a66c2">Notification settings</a>
  </p>
</div>`;
  const text = `${matches.length} medication${matches.length === 1 ? "" : "s"} in your cabinet ${matches.length === 1 ? "has" : "have"} a recall notice.

${userName},

Today's FDA check found:

${matchText}

Review at: ${appUrl}/notifications`;
  return { subject, html, text };
}

/**
 * Send one daily digest email per user.
 * Idempotent within a UTC day: re-running won't double-send because
 * `notification_preferences.last_digest_sent_at` is checked against
 * the start of today UTC.
 */
export async function sendDailyDigests(
  supabase: SupabaseClient,
  appUrl: string,
): Promise<DigestStats> {
  const stats: DigestStats = {
    usersConsidered: 0,
    emailsSent: 0,
    skipped: 0,
    failed: 0,
  };

  const todayStart = startOfTodayUtc();
  const nowIso = new Date().toISOString();

  const { data: medUsers } = await supabase
    .from("medication_items")
    .select("user_id")
    .eq("status", "active");
  const userIds = Array.from(
    new Set(((medUsers ?? []) as { user_id: string }[]).map((r) => r.user_id)),
  );

  for (const userId of userIds) {
    stats.usersConsidered++;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.email) {
      stats.skipped++;
      continue;
    }

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled, last_digest_sent_at")
      .eq("user_id", userId)
      .maybeSingle();

    const emailEnabled = prefs?.email_enabled ?? true;
    if (!emailEnabled) {
      stats.skipped++;
      continue;
    }

    if (
      prefs?.last_digest_sent_at &&
      new Date(prefs.last_digest_sent_at) >= todayStart
    ) {
      stats.skipped++;
      continue;
    }

    const { count: medCountRes } = await supabase
      .from("medication_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");
    const medCount = medCountRes ?? 0;
    if (medCount === 0) {
      stats.skipped++;
      continue;
    }

    const { data: notifs } = await supabase
      .from("notifications")
      .select(
        `id, classification, created_at,
         medication_items!inner(id, product_name, manufacturer),
         recalls!inner(recall_number, reason_for_recall)`,
      )
      .eq("user_id", userId)
      .is("email_sent_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const matches = (notifs ?? []) as unknown as Match[];

    const userName = profile.full_name?.trim() || profile.email.split("@")[0];
    const { subject, html, text } = composeDigest({
      userName,
      matches,
      medCount,
      appUrl,
    });

    const ok = await sendEmailQuietly({
      to: profile.email,
      subject,
      html,
      text,
    });

    if (!ok) {
      stats.failed++;
      continue;
    }

    stats.emailsSent++;

    if (matches.length > 0) {
      const ids = matches.map((m) => m.id);
      await supabase
        .from("notifications")
        .update({ email_sent_at: nowIso })
        .in("id", ids);
    }

    await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, last_digest_sent_at: nowIso },
        { onConflict: "user_id" },
      );
  }

  return stats;
}

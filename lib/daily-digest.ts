import type { SupabaseClient } from "@supabase/supabase-js";
import { loadEmailTemplate, renderEmailTemplate } from "./email-template";
import { sendEmailQuietly } from "./mailer";
import { hasPaidPlan, type Plan } from "./plan";
import { getEffectivePlan } from "./stripe-billing";

export type DigestCadence = "daily" | "weekly";

/** Skip threshold (UTC) below which a user is eligible for the next digest. */
function skipThreshold(cadence: DigestCadence): Date {
  const now = new Date();
  if (cadence === "daily") {
    const t = new Date(now);
    t.setUTCHours(0, 0, 0, 0);
    return t;
  }
  // weekly: at most one digest per ~7-day window. 6.5-day margin avoids
  // clock-skew double-sends across Sunday-noon-ET (17:00 UTC) cron firings.
  return new Date(now.getTime() - 6.5 * 24 * 60 * 60 * 1000);
}

function planMatchesCadence(plan: Plan, cadence: DigestCadence): boolean {
  return cadence === "daily" ? hasPaidPlan(plan) : plan === "free";
}

export type DigestMatch = {
  id: number;
  classification: string | null;
  created_at: string;
  medication_items: {
    id: number;
    product_name: string;
    manufacturer: string;
    status: string;
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function classBadgeStyles(tier: RecallClassTier | null): {
  label: string;
  bg: string;
  color: string;
} {
  if (tier === "I") {
    return { label: recallClassLabelForTier("I"), bg: "#ba1a1a", color: "#ffffff" };
  }
  if (tier === "II") {
    return { label: recallClassLabelForTier("II"), bg: "#ffdbcf", color: "#00342b" };
  }
  if (tier === "III") {
    return { label: recallClassLabelForTier("III"), bg: "#707975", color: "#ffffff" };
  }
  return { label: "Unclassified", bg: "#ceedfd", color: "#00342b" };
}

function buildAlertRowsHtml(matches: DigestMatch[]): string {
  const rows = matches.filter((m) => m.medication_items && m.recalls);
  if (rows.length === 0) return "";

  return rows
    .map((m, index) => {
      const med = m.medication_items!;
      const rec = m.recalls!;
      const tier = parseRecallClassTier(m.classification);
      const badge = classBadgeStyles(tier);
      const marginTop = index === 0 ? "0" : "12px";

      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${marginTop}; border-collapse: collapse; border: 1px solid rgba(0, 52, 43, 0.1); border-radius: 6px; overflow: hidden;">
  <tr>
    <td style="padding: 16px 18px; background: #ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: top;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; background: ${badge.bg}; color: ${badge.color};">
              ${esc(badge.label)}
            </span>
            <div style="margin-top: 10px; font-family: Merriweather, Georgia, serif; font-size: 18px; font-weight: 700; color: #00342b; line-height: 24px;">
              ${esc(med.product_name)}
            </div>
            <div style="margin-top: 4px; font-size: 14px; color: #3f4945;">
              ${esc(med.manufacturer)}
            </div>
          </td>
        </tr>
      </table>
      <p style="margin: 14px 0 0 0; font-size: 15px; color: #001f2a; line-height: 22px;">
        ${esc(rec.reason_for_recall ?? "See FDA notice")}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #707975; font-family: 'Courier New', monospace;">
        Recall #${esc(rec.recall_number)}
      </p>
    </td>
  </tr>
</table>`;
    })
    .join("");
}

function composeMatchesText(matches: DigestMatch[]): string {
  return matches
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
  <p><a href="${appUrl}/notifications" style="color:#0d9488">Review all alerts in your dashboard →</a></p>`;
  const text = rows
    .map(
      (r) =>
        `• ${r.product} (${r.manufacturer}) — ${r.cls}\n  Recall #${r.recallNumber}: ${r.reason}`,
    )
    .join("\n\n");
}

/** Unread alerts for medications still active in the cabinet (digest must match in-app). */
export function filterDigestNotifications(rows: DigestMatch[]): DigestMatch[] {
  return rows.filter(
    (n) => n.medication_items?.status === "active" && n.recalls != null,
  );
}

export function countDistinctMedications(matches: DigestMatch[]): number {
  const keys = new Set<string>();
  for (const m of matches) {
    if (!m.medication_items) continue;
    const med = m.medication_items;
    keys.add(`${med.product_name}\0${med.manufacturer}`.toLowerCase());
  }
  return keys.size;
}

export function composeDigest(args: {
  userName: string;
  matches: DigestMatch[];
  medCount: number;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { userName, matches, medCount, appUrl } = args;
  const safeUser = esc(userName);
  const medCountLabel =
    medCount === 1 ? "1 medication" : `${medCount} medications`;

  if (matches.length === 0) {
    const subject = "[FDA] Daily check — no recalls found";
    const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="margin:0 0 8px;font-size:20px">All clear, ${safeUser}.</h2>
  <p style="margin:0 0 16px">
    We checked your ${medCount} medication${medCount === 1 ? "" : "s"} against the FDA recall
    database today. <strong>No recalls found.</strong>
  </p>
  <p style="font-size:14px;color:#666">
    You&rsquo;ll get this check every day. If something is recalled, you&rsquo;ll see it here first.
  </p>
  <p style="margin-top:24px;font-size:13px;color:#888">
    <a href="${appUrl}/cabinet" style="color:#0d9488">Manage your cabinet</a> ·
    <a href="${appUrl}/settings/notifications" style="color:#0d9488">Notification settings</a>
  </p>
</div>`;
    const text = `All clear, ${userName}.

We checked your ${medCountLabel} against the FDA recall database today. No recalls found.

You'll get this check every day. If something is recalled, you'll see it here first.

Medicine cabinet: ${appUrl}/cabinet
Notification settings: ${appUrl}/settings/notifications`;
    return { subject, html, text };
  }

  const subject = `[FDA] ${matches.length} recall match${matches.length === 1 ? "" : "es"} for your medications`;
  const { html: matchHtml, text: matchText } = composeMatches(matches, appUrl);
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
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
    <a href="${appUrl}/settings/notifications" style="color:#0d9488">Notification settings</a>
  </p>
</div>`;
  const text = `${matches.length} medication${matches.length === 1 ? "" : "s"} in your cabinet ${matches.length === 1 ? "has" : "have"} a recall notice.

${userName},

Today's FDA check found:

${matchText}

Review all alerts: ${appUrl}/notifications
Medicine cabinet: ${appUrl}/cabinet`;

  return { subject, html, text };
}

/**
 * Send one digest email per eligible user.
 *
 * Cadence routing:
 *   - "daily"  → only paid plans (personal, family); idempotent per UTC day
 *   - "weekly" → only free plan; idempotent within a 6.5-day window (one email
 *                per calendar week of Sunday cron firings)
 *
 * Both cadences use `notification_preferences.last_digest_sent_at` as the
 * idempotency key — the check is just a different time threshold.
 */
export async function sendDigests(
  supabase: SupabaseClient,
  appUrl: string,
  cadence: DigestCadence,
): Promise<DigestStats> {
  const stats: DigestStats = {
    usersConsidered: 0,
    emailsSent: 0,
    skipped: 0,
    failed: 0,
  };

  const threshold = skipThreshold(cadence);
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

    // Plan-based routing: skip users whose plan doesn't match this cadence.
    const userPlan = await getEffectivePlan(supabase, userId);
    if (!planMatchesCadence(userPlan, cadence)) {
      stats.skipped++;
      continue;
    }

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
      .select("email_enabled, email_digest_enabled, last_digest_sent_at")
      .eq("user_id", userId)
      .maybeSingle();

    const masterEmail = prefs?.email_enabled ?? true;
    const digestOn = prefs?.email_digest_enabled ?? true;
    if (!masterEmail || !digestOn) {
      stats.skipped++;
      continue;
    }

    if (
      prefs?.last_digest_sent_at &&
      new Date(prefs.last_digest_sent_at) >= threshold
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

    const { data: notifs, error: notifErr } = await supabase
      .from("notifications")
      .select(
        `id, classification, created_at,
         medication_items!inner(id, product_name, manufacturer, status),
         recalls!inner(recall_number, reason_for_recall)`,
      )
      .eq("user_id", userId)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(20);

    if (notifErr) {
      console.error("[digest] fetch notifications failed:", notifErr.message);
      stats.failed++;
      continue;
    }

    const matches = filterDigestNotifications((notifs ?? []) as unknown as DigestMatch[]);

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

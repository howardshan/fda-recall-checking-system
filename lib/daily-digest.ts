import type { SupabaseClient } from "@supabase/supabase-js";
import { loadEmailTemplate, renderEmailTemplate } from "./email-template";
import { sendEmailQuietly } from "./mailer";
import {
  parseRecallClassTier,
  recallClassLabelForTier,
  type RecallClassTier,
} from "./recall-classification";

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

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
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
      const tier = parseRecallClassTier(m.classification);
      const cls = tier ? recallClassLabelForTier(tier) : "Unclassified";
      return `• ${med.product_name} (${med.manufacturer}) — ${cls}\n  Recall #${rec.recall_number}: ${rec.reason_for_recall ?? "See FDA notice"}`;
    })
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
    const html = renderEmailTemplate(loadEmailTemplate("daily-digest-clear.html"), {
      userName: safeUser,
      medCountLabel,
      appUrl,
    });
    const text = `All clear, ${userName}.

We checked your ${medCountLabel} against the FDA recall database today. No recalls found.

You'll get this check every day. If something is recalled, you'll see it here first.

Medicine cabinet: ${appUrl}/cabinet
Notification settings: ${appUrl}/settings/notifications`;
    return { subject, html, text };
  }

  const alertCount = matches.length;
  const medCountWithAlerts = countDistinctMedications(matches);
  const subject = `[FDA] ${alertCount} unread recall alert${alertCount === 1 ? "" : "s"} in your cabinet`;
  const medPhrase =
    medCountWithAlerts === 1
      ? "1 medication"
      : `${medCountWithAlerts} medications`;
  const headline =
    alertCount === 1
      ? "1 unread recall alert"
      : `${alertCount} unread recall alerts`;
  const summaryLine = `${alertCount} alert${alertCount === 1 ? "" : "s"} across ${medPhrase} in your cabinet`;

  const html = renderEmailTemplate(loadEmailTemplate("daily-digest-alerts.html"), {
    userName: safeUser,
    headline,
    summaryLine,
    alertCountPlural: alertCount === 1 ? "" : "s",
    alertRows: buildAlertRowsHtml(matches),
    appUrl,
  });

  const matchText = composeMatchesText(matches);
  const text = `${headline} for ${medPhrase}.

${userName},

Today's FDA check found:

${matchText}

Review all alerts: ${appUrl}/notifications
Medicine cabinet: ${appUrl}/cabinet`;

  return { subject, html, text };
}

/**
 * Send one daily digest email per user.
 * Idempotent within a UTC day: re-running won't double-send because
 * `notification_preferences.last_digest_sent_at` is checked against
 * the start of today UTC.
 *
 * Digest content mirrors in-app unread alerts (active meds). We do not
 * require `email_sent_at` to be null — a notification can stay unread in
 * the dashboard after a prior digest already marked the email channel.
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

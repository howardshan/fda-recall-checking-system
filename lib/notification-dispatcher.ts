import type { SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sendEmailQuietly } from "./mailer";
import { sendSmsQuietly } from "./sms";

type PendingRow = {
  id: number;
  user_id: string;
  classification: string | null;
  created_at: string;
  email_sent_at: string | null;
  sms_sent_at: string | null;
  medication_items: {
    id: number;
    product_name: string;
    manufacturer: string;
    status: string;
    expected_stop_date: string | null;
  } | null;
  recalls: {
    recall_number: string;
    reason_for_recall: string | null;
    recall_initiation_date: string | null;
  } | null;
  profiles: { email: string; full_name: string | null } | null;
  notification_preferences: {
    email_enabled: boolean;
    sms_enabled: boolean;
    phone_number: string | null;
    alert_on_class_i: boolean;
    alert_on_class_ii: boolean;
    alert_on_class_iii: boolean;
    alert_after_stop_date: boolean;
  } | null;
};

type ClassTier = "I" | "II" | "III" | "unknown";

function classify(raw: string | null): ClassTier {
  if (!raw) return "unknown";
  if (/class\s*iii\b/i.test(raw)) return "III";
  if (/class\s*ii\b/i.test(raw)) return "II";
  if (/class\s*i\b/i.test(raw)) return "I";
  return "unknown";
}

function classTemplateTokens(tier: ClassTier): {
  classHeadline: string;
  classSubhead: string;
  classBannerBg: string;
  classBannerText: string;
} {
  switch (tier) {
    case "I":
      return {
        classHeadline: "Class I — Serious Risk",
        classSubhead: "Reasonable probability of serious adverse health consequences. Act promptly.",
        classBannerBg: "#ba1a1a",
        classBannerText: "#ffffff",
      };
    case "II":
      return {
        classHeadline: "Class II — Moderate Risk",
        classSubhead:
          "Potential for temporary or medically reversible adverse health consequences.",
        classBannerBg: "#ffdbcf",
        classBannerText: "#00342b",
      };
    case "III":
      return {
        classHeadline: "Class III — Low Risk",
        classSubhead:
          "Not likely to cause adverse health consequences, but a labeling or quality issue exists.",
        classBannerBg: "#707975",
        classBannerText: "#ffffff",
      };
    default:
      return {
        classHeadline: "FDA Recall Notice",
        classSubhead:
          "A medication in your cabinet is subject to an FDA recall. Review the details below.",
        classBannerBg: "#00342b",
        classBannerText: "#ffffff",
      };
  }
}

function shouldNotifyByClass(
  tier: ClassTier,
  prefs: PendingRow["notification_preferences"],
): boolean {
  if (!prefs) {
    // No preferences row — default to alert I+II.
    return tier !== "III";
  }
  if (tier === "I") return prefs.alert_on_class_i;
  if (tier === "II") return prefs.alert_on_class_ii;
  if (tier === "III") return prefs.alert_on_class_iii;
  return prefs.alert_on_class_i; // unknown — treat conservatively
}

function isPastStopDate(stopDate: string | null): boolean {
  if (!stopDate) return false;
  const stop = new Date(stopDate);
  if (Number.isNaN(stop.getTime())) return false;
  return stop.getTime() < Date.now();
}

let cachedTemplate: string | null = null;
async function loadTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const path = join(process.cwd(), "emails", "recall-alert.html");
  cachedTemplate = await readFile(path, "utf-8");
  return cachedTemplate;
}

function render(template: string, vars: Record<string, string>): string {
  // Minimal mustache-style: {{var}} substitutions + {{#if x}}...{{/if}} sections.
  let out = template;
  out = out.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, body) =>
    vars[name] ? body : "",
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? "");
  return out;
}

/**
 * Dispatch pending notifications:
 *   1. fetch notifications where email_sent_at is null AND status='unread'
 *   2. join with med item + recall + profile + prefs
 *   3. filter by class preferences + stop-date rules (Class I always notifies)
 *   4. send email, set email_sent_at
 *
 * Use a service-role Supabase client (so RLS doesn't get in the way).
 */
/**
 * Build a short SMS body for a Class I / II recall. ~160 chars target so
 * single-segment SMS is preferred.
 */
function smsBodyFor(
  tier: ClassTier,
  productName: string,
  recallNumber: string,
  appUrl: string,
): string {
  const tag = tier === "unknown" ? "FDA recall" : `FDA Class ${tier}`;
  return `${tag}: ${productName} — recall #${recallNumber}. Details: ${appUrl}/notifications`;
}

export async function dispatchPendingEmails(
  supabase: SupabaseClient,
  appUrl: string,
): Promise<{
  considered: number;
  emailsSent: number;
  smsSent: number;
  skipped: number;
  failed: number;
}> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id, user_id, classification, created_at, email_sent_at, sms_sent_at,
      medication_items!inner(id, product_name, manufacturer, status, expected_stop_date),
      recalls!inner(recall_number, reason_for_recall, recall_initiation_date),
      profiles!inner(email, full_name),
      notification_preferences(email_enabled, sms_enabled, phone_number, alert_on_class_i, alert_on_class_ii, alert_on_class_iii, alert_after_stop_date)
      `,
    )
    .or("email_sent_at.is.null,sms_sent_at.is.null")
    .eq("status", "unread")
    .limit(200);

  if (error) {
    console.error("[dispatcher] fetch pending failed:", error.message);
    return { considered: 0, emailsSent: 0, smsSent: 0, skipped: 0, failed: 0 };
  }
  const rows = (data ?? []) as unknown as PendingRow[];
  const template = await loadTemplate();

  let emailsSent = 0;
  let smsSent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const tier = classify(row.classification);
    const prefs = row.notification_preferences;

    // Stop-date rule: if past expected_stop_date AND user opted out AND not Class I
    // (Class I always notifies regardless of stop-date opt-out — safety default).
    const past = isPastStopDate(row.medication_items?.expected_stop_date ?? null);
    const stopOptOut = !(prefs?.alert_after_stop_date ?? false);
    const stopOutsideClassI = past && stopOptOut && tier !== "I";

    const classAllowed = shouldNotifyByClass(tier, prefs);
    if (!classAllowed || stopOutsideClassI) {
      // Class/stop-date rules skip both channels. Mark both processed.
      skipped++;
      await supabase
        .from("notifications")
        .update({
          email_sent_at: row.email_sent_at ?? new Date().toISOString(),
          sms_sent_at: row.sms_sent_at ?? new Date().toISOString(),
        })
        .eq("id", row.id);
      continue;
    }

    if (
      row.medication_items?.status === "deleted" ||
      !row.medication_items ||
      !row.recalls
    ) {
      skipped++;
      continue;
    }

    // Email channel ------------------------------------------------------
    if (!row.email_sent_at && row.profiles?.email) {
      const emailEnabled = prefs?.email_enabled ?? true;
      if (emailEnabled) {
        const banner = classTemplateTokens(tier);
        const userName =
          row.profiles.full_name?.trim() || row.profiles.email.split("@")[0];
        const html = render(template, {
          ...banner,
          userName,
          productName: row.medication_items.product_name,
          manufacturer: row.medication_items.manufacturer,
          recallReason: row.recalls.reason_for_recall ?? "See FDA notice",
          recallNumber: row.recalls.recall_number,
          recallDate: row.recalls.recall_initiation_date ?? "",
          appUrl,
          unsubscribeUrl: `${appUrl}/cabinet/${row.medication_items.id}/edit`,
        });
        const subject = `[FDA ${tier === "unknown" ? "Recall" : `Class ${tier}`}] ${row.medication_items.product_name} — recall notice`;
        const ok = await sendEmailQuietly({
          to: row.profiles.email,
          subject,
          html,
        });
        if (ok) {
          emailsSent++;
          await supabase
            .from("notifications")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", row.id);
        } else {
          failed++;
        }
      } else {
        // Email disabled — mark processed so we don't reconsider it
        await supabase
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }

    // SMS channel — only Class I and Class II, only when explicitly opted in
    // with a phone number on file.
    if (!row.sms_sent_at) {
      const smsEnabled = prefs?.sms_enabled ?? false;
      const phone = prefs?.phone_number?.trim();
      const smsClassOk = tier === "I" || tier === "II";
      if (smsEnabled && phone && smsClassOk) {
        const body = smsBodyFor(
          tier,
          row.medication_items.product_name,
          row.recalls.recall_number,
          appUrl,
        );
        const ok = await sendSmsQuietly({ to: phone, body });
        if (ok) {
          smsSent++;
          await supabase
            .from("notifications")
            .update({ sms_sent_at: new Date().toISOString() })
            .eq("id", row.id);
        } else {
          failed++;
        }
      } else {
        // SMS not applicable — mark processed.
        await supabase
          .from("notifications")
          .update({ sms_sent_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }
  }

  return { considered: rows.length, emailsSent, smsSent, skipped, failed };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sendEmailQuietly } from "./mailer";
import { canReceiveInstantEmail } from "./plan";
import { getEffectivePlan } from "./stripe-billing";

type PendingRow = {
  id: number;
  user_id: string;
  classification: string | null;
  created_at: string;
  email_sent_at: string | null;
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
    email_instant_enabled: boolean;
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
    return tier !== "III";
  }
  if (tier === "I") return prefs.alert_on_class_i;
  if (tier === "II") return prefs.alert_on_class_ii;
  if (tier === "III") return prefs.alert_on_class_iii;
  return prefs.alert_on_class_i;
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
  let out = template;
  out = out.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, body) =>
    vars[name] ? body : "",
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? "");
  return out;
}

/**
 * Dispatch pending instant recall emails for unread notifications.
 * Use a service-role Supabase client (RLS bypass).
 */
export async function dispatchPendingEmails(
  supabase: SupabaseClient,
  appUrl: string,
): Promise<{
  considered: number;
  emailsSent: number;
  skipped: number;
  failed: number;
}> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id, user_id, classification, created_at, email_sent_at,
      medication_items!inner(id, product_name, manufacturer, status, expected_stop_date),
      recalls!inner(recall_number, reason_for_recall, recall_initiation_date),
      profiles!inner(email, full_name),
      notification_preferences(email_enabled, email_instant_enabled, alert_on_class_i, alert_on_class_ii, alert_on_class_iii, alert_after_stop_date)
      `,
    )
    .is("email_sent_at", null)
    .eq("status", "unread")
    .limit(200);

  if (error) {
    console.error("[dispatcher] fetch pending failed:", error.message);
    return { considered: 0, emailsSent: 0, skipped: 0, failed: 0 };
  }
  const rows = (data ?? []) as unknown as PendingRow[];
  const template = await loadTemplate();

  let emailsSent = 0;
  let skipped = 0;
  let failed = 0;
  const planCache = new Map<string, Awaited<ReturnType<typeof getEffectivePlan>>>();

  async function planForUser(userId: string) {
    let p = planCache.get(userId);
    if (!p) {
      p = await getEffectivePlan(supabase, userId);
      planCache.set(userId, p);
    }
    return p;
  }

  for (const row of rows) {
    const tier = classify(row.classification);
    const prefs = row.notification_preferences;

    const past = isPastStopDate(row.medication_items?.expected_stop_date ?? null);
    const stopOptOut = !(prefs?.alert_after_stop_date ?? false);
    const stopOutsideClassI = past && stopOptOut && tier !== "I";

    const classAllowed = shouldNotifyByClass(tier, prefs);
    if (!classAllowed || stopOutsideClassI) {
      skipped++;
      await supabase
        .from("notifications")
        .update({ email_sent_at: row.email_sent_at ?? new Date().toISOString() })
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

    if (!row.email_sent_at && row.profiles?.email) {
      const userPlan = await planForUser(row.user_id);
      const masterEmail = prefs?.email_enabled ?? true;
      const instantOn = prefs?.email_instant_enabled ?? true;
      const planAllowsInstant = canReceiveInstantEmail(userPlan);

      if (masterEmail && instantOn && planAllowsInstant) {
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
        // Free plan, prefs off, or instant disabled — mark processed (digest may cover later).
        await supabase
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }
  }

  return { considered: rows.length, emailsSent, skipped, failed };
}

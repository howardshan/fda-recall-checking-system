import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findRecallsForItem,
  notifyMatchesForItem,
  type CabinetItem,
} from "./matching";

/** System dismiss when a medication is paused due to plan quota. */
export const DISMISS_REASON_MONITORING_PAUSED = "monitoring_paused";

export function recallIdsFromMatches(
  matches: { id: number }[],
): number[] {
  return matches.map((m) => m.id);
}

/**
 * Dismiss unread notifications for medications that entered paused monitoring.
 */
export async function dismissUnreadForPausedMedications(
  supabase: SupabaseClient,
  medicationItemIds: number[],
): Promise<number> {
  if (medicationItemIds.length === 0) return 0;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .update({
      status: "dismissed",
      dismiss_reason: DISMISS_REASON_MONITORING_PAUSED,
      email_sent_at: nowIso,
    })
    .in("medication_item_id", medicationItemIds)
    .eq("status", "unread")
    .select("id");

  if (error) {
    console.error(
      "[notification-monitoring] dismiss for paused failed:",
      error.message,
    );
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * After medications are reactivated, restore auto-dismissed alerts that still
 * match current recalls, then scan for any new matches while paused.
 */
export async function restoreNotificationsForReactivatedMedications(
  supabase: SupabaseClient,
  userId: string,
  medicationItemIds: number[],
): Promise<{ restored: number; newNotifications: number }> {
  if (medicationItemIds.length === 0) {
    return { restored: 0, newNotifications: 0 };
  }

  const { data: items, error: itemsErr } = await supabase
    .from("medication_items")
    .select(
      "id, user_id, product_name, manufacturer, product_ndc, lot_number, expected_stop_date, manufacturer_unverified",
    )
    .eq("user_id", userId)
    .in("id", medicationItemIds)
    .eq("status", "active");

  if (itemsErr) {
    console.error(
      "[notification-monitoring] fetch reactivated items failed:",
      itemsErr.message,
    );
    return { restored: 0, newNotifications: 0 };
  }

  let restored = 0;
  let newNotifications = 0;

  for (const row of (items ?? []) as CabinetItem[]) {
    const matches = await findRecallsForItem(supabase, row);
    const recallIds = recallIdsFromMatches(matches);

    if (recallIds.length > 0) {
      const { data: restoredRows, error: restoreErr } = await supabase
        .from("notifications")
        .update({
          status: "unread",
          dismiss_reason: null,
        })
        .eq("medication_item_id", row.id)
        .eq("dismiss_reason", DISMISS_REASON_MONITORING_PAUSED)
        .eq("status", "dismissed")
        .in("recall_id", recallIds)
        .select("id");

      if (restoreErr) {
        console.error(
          "[notification-monitoring] restore failed:",
          restoreErr.message,
        );
      } else {
        restored += restoredRows?.length ?? 0;
      }
    }

    newNotifications += await notifyMatchesForItem(supabase, row);
  }

  return { restored, newNotifications };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dismissUnreadForPausedMedications,
  restoreNotificationsForReactivatedMedications,
} from "./notification-monitoring";
import { getUserPlan, medQuota, type Plan } from "./plan";

type MedRow = { id: number; added_at: string | null };

/**
 * Given active meds sorted by added_at asc, return ids that should stay active
 * (first `limit` items). Pure helper for tests.
 */
export function selectMonitoredMedIds(
  activeMeds: MedRow[],
  limit: number,
): Set<number> {
  const sorted = [...activeMeds].sort((a, b) => {
    const ta = a.added_at ? new Date(a.added_at).getTime() : 0;
    const tb = b.added_at ? new Date(b.added_at).getTime() : 0;
    return ta - tb;
  });
  return new Set(sorted.slice(0, limit).map((m) => m.id));
}

/**
 * Align medication_items active/paused status with the user's current plan quota.
 * Oldest active meds are kept; excess become paused. Paused meds are re-activated
 * when quota increases (upgrade).
 */
export type SyncMonitoringQuotaResult = {
  paused: number;
  reactivated: number;
  notificationsDismissed: number;
  notificationsRestored: number;
  newNotifications: number;
};

export async function syncMonitoringQuota(
  supabase: SupabaseClient,
  userId: string,
  planOverride?: Plan,
): Promise<SyncMonitoringQuotaResult> {
  const plan = planOverride ?? (await getUserPlan(supabase, userId));
  const limit = medQuota(plan);

  const { data: activeRows, error: activeErr } = await supabase
    .from("medication_items")
    .select("id, added_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("added_at", { ascending: true });

  if (activeErr) {
    console.error("[plan-monitoring] fetch active failed:", activeErr.message);
    return {
      paused: 0,
      reactivated: 0,
      notificationsDismissed: 0,
      notificationsRestored: 0,
      newNotifications: 0,
    };
  }

  const active = (activeRows ?? []) as MedRow[];
  let paused = 0;
  let reactivated = 0;
  let notificationsDismissed = 0;
  let notificationsRestored = 0;
  let newNotifications = 0;

  if (active.length > limit) {
    const keep = selectMonitoredMedIds(active, limit);
    const toPause = active.filter((m) => !keep.has(m.id)).map((m) => m.id);
    if (toPause.length > 0) {
      const { error } = await supabase
        .from("medication_items")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .in("id", toPause);
      if (error) {
        console.error("[plan-monitoring] pause failed:", error.message);
      } else {
        paused = toPause.length;
        notificationsDismissed = await dismissUnreadForPausedMedications(
          supabase,
          toPause,
        );
      }
    }
  }

  const activeCount = Math.min(active.length, limit);
  const slots = limit - activeCount;
  if (slots > 0) {
    const { data: pausedRows, error: pausedErr } = await supabase
      .from("medication_items")
      .select("id, added_at")
      .eq("user_id", userId)
      .eq("status", "paused")
      .order("added_at", { ascending: true })
      .limit(slots);

    if (pausedErr) {
      console.error("[plan-monitoring] fetch paused failed:", pausedErr.message);
      return {
        paused,
        reactivated,
        notificationsDismissed,
        notificationsRestored,
        newNotifications,
      };
    }

    const toActivate = (pausedRows ?? []).map((m) => (m as MedRow).id);
    if (toActivate.length > 0) {
      const { error } = await supabase
        .from("medication_items")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .in("id", toActivate);
      if (error) {
        console.error("[plan-monitoring] reactivate failed:", error.message);
      } else {
        reactivated = toActivate.length;
        const restoreResult = await restoreNotificationsForReactivatedMedications(
          supabase,
          userId,
          toActivate,
        );
        notificationsRestored = restoreResult.restored;
        newNotifications = restoreResult.newNotifications;
      }
    }
  }

  return {
    paused,
    reactivated,
    notificationsDismissed,
    notificationsRestored,
    newNotifications,
  };
}

/** True if this active item is within the user's monitored quota (by added_at). */
export async function isItemMonitored(
  supabase: SupabaseClient,
  userId: string,
  itemId: number,
): Promise<boolean> {
  const plan = await getUserPlan(supabase, userId);
  const limit = medQuota(plan);

  const { data, error } = await supabase
    .from("medication_items")
    .select("id, added_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("added_at", { ascending: true });

  if (error) {
    console.error("[plan-monitoring] isItemMonitored fetch failed:", error.message);
    return false;
  }

  const active = (data ?? []) as MedRow[];
  return selectMonitoredMedIds(active, limit).has(itemId);
}

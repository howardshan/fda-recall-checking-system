import type { SupabaseClient } from "@supabase/supabase-js";
import { checkRecall, type RecallMatch } from "./check-recall";
import { isItemMonitored } from "./plan-monitoring";

export type CabinetItem = {
  id: number;
  user_id: string;
  product_name: string;
  manufacturer: string;
  product_ndc: string | null;
  lot_number: string | null;
  expected_stop_date: string | null;
  manufacturer_unverified?: boolean;
};

/**
 * Run the existing recall-matching engine for one cabinet item. Returns the
 * RecallMatch[] (NDC-exact or whole-word product + manufacturer overlap).
 */
export async function findRecallsForItem(
  supabase: SupabaseClient,
  item: CabinetItem,
): Promise<RecallMatch[]> {
  const result = await checkRecall(supabase, {
    productName: item.product_name,
    manufacturer: item.manufacturer,
    ndc: item.product_ndc,
    lotNumber: item.lot_number,
  });
  if (result.status === "not_found") return [];
  return result.matches;
}

/**
 * For a single cabinet item, find matching recalls and insert notification
 * rows (de-duped by the `unique(user_id, medication_item_id, recall_id)`
 * constraint). Returns the count of NEW notifications created.
 *
 * Called from:
 *   - /api/cabinet POST (after a user adds a medication)
 *   - the post-sync hook in /api/sync (scoped to newly-synced recalls)
 */
export async function notifyMatchesForItem(
  supabase: SupabaseClient,
  item: CabinetItem,
): Promise<number> {
  if (item.manufacturer_unverified) return 0;

  const monitored = await isItemMonitored(supabase, item.user_id, item.id);
  if (!monitored) return 0;

  const matches = await findRecallsForItem(supabase, item);
  if (matches.length === 0) return 0;

  const rows = matches.map((m) => ({
    user_id: item.user_id,
    medication_item_id: item.id,
    recall_id: m.id,
    classification: m.classification,
  }));

  // upsert with ON CONFLICT DO NOTHING (via unique constraint) gives us
  // dedup against re-runs. count returns ONLY newly inserted rows.
  const { error, count } = await supabase
    .from("notifications")
    .upsert(rows, {
      onConflict: "user_id,medication_item_id,recall_id",
      ignoreDuplicates: true,
      count: "exact",
    });
  if (error) {
    console.error("[matching] notifications upsert failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Scan all active medication_items against the recall database. Used by the
 * post-sync hook so newly-synced recalls match against existing cabinets.
 *
 * Returns total number of NEW notifications inserted across all users.
 */
export async function scanAllActiveItems(
  supabase: SupabaseClient,
): Promise<{ scanned: number; newNotifications: number }> {
  const { data, error } = await supabase
    .from("medication_items")
    .select(
      "id, user_id, product_name, manufacturer, product_ndc, lot_number, expected_stop_date, manufacturer_unverified",
    )
    .eq("status", "active");
  if (error) {
    console.error("[matching] scan failed:", error.message);
    return { scanned: 0, newNotifications: 0 };
  }
  const items = (data ?? []) as CabinetItem[];
  let total = 0;
  for (const item of items) {
    total += await notifyMatchesForItem(supabase, item);
  }
  return { scanned: items.length, newNotifications: total };
}

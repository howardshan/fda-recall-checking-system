import type { SupabaseClient } from "@supabase/supabase-js";

export type CabinetListItem = {
  id: number;
  product_name: string;
  manufacturer: string;
  product_ndc: string | null;
  lot_number: string | null;
  added_at: string;
  manufacturer_unverified: boolean;
  member_id: number | null;
  member_display_name: string | null;
};

const ITEM_COLUMNS =
  "id, product_name, manufacturer, product_ndc, lot_number, added_at, manufacturer_unverified, member_id";

type MedRow = {
  id: number;
  product_name: string;
  manufacturer: string;
  product_ndc: string | null;
  lot_number: string | null;
  added_at: string;
  manufacturer_unverified: boolean;
  member_id: number | null;
};

async function familyNameById(
  supabase: SupabaseClient,
): Promise<Map<number, string>> {
  const { data, error } = await supabase
    .from("family_members")
    .select("id, display_name");
  if (error) {
    console.error("[cabinet-items] family_members fetch failed:", error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as { id: number; display_name: string }[]).map((m) => [
      m.id,
      m.display_name,
    ]),
  );
}

export async function listCabinetItems(
  supabase: SupabaseClient,
  status: "active" | "paused",
): Promise<{ items: CabinetListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("medication_items")
    .select(ITEM_COLUMNS)
    .eq("status", status)
    .order("added_at", { ascending: false });

  if (error) {
    console.error(`[cabinet-items] medication_items (${status}) fetch failed:`, error.message);
    return { items: [], error: error.message };
  }

  const rows = (data ?? []) as MedRow[];
  const memberNames = await familyNameById(supabase);

  const items = rows.map((row) => ({
    ...row,
    member_display_name:
      row.member_id != null ? memberNames.get(row.member_id) ?? null : null,
  }));

  return { items, error: null };
}

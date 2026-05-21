import type { SupabaseClient } from "@supabase/supabase-js";
import type { NdcProductRow, OpenFdaNdcRecord } from "./types";

function emptyToNull(s: string | undefined | null): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length === 0 ? null : t;
}

export function normalizeNdcRecord(rec: OpenFdaNdcRecord): NdcProductRow | null {
  const productNdc = emptyToNull(rec.product_ndc);
  // We allow records without product_ndc only if they have a name (still useful for matching).
  const hasAnyName =
    emptyToNull(rec.generic_name) ||
    emptyToNull(rec.brand_name) ||
    emptyToNull(rec.labeler_name);
  if (!productNdc && !hasAnyName) return null;
  return {
    product_ndc: productNdc,
    generic_name: emptyToNull(rec.generic_name),
    brand_name: emptyToNull(rec.brand_name),
    labeler_name: emptyToNull(rec.labeler_name),
    dosage_form: emptyToNull(rec.dosage_form),
    raw: rec,
  };
}

export async function insertNdcBatch(
  supabase: SupabaseClient,
  rows: NdcProductRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  // ndc_products has no unique constraint to upsert on; we wipe + insert in the seed.
  const { error, count } = await supabase
    .from("ndc_products")
    .insert(rows, { count: "exact" });
  if (error) throw new Error(`ndc_products insert failed: ${error.message}`);
  return count ?? rows.length;
}

export async function insertNdcChunked(
  supabase: SupabaseClient,
  rows: NdcProductRow[],
  chunkSize = 500,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    total += await insertNdcBatch(supabase, chunk);
  }
  return total;
}

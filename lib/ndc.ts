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
  const { error } = await supabase.from("ndc_products").insert(rows);
  if (error) throw new Error(`ndc_products insert failed: ${error.message}`);
  return rows.length;
}

export async function insertNdcChunked(
  supabase: SupabaseClient,
  rows: NdcProductRow[],
  chunkSize = 200,
): Promise<number> {
  let total = 0;
  const startedAt = Date.now();
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    let attempts = 0;
    // Retry timeouts up to 3x with backoff before bailing.
    while (true) {
      try {
        total += await insertNdcBatch(supabase, chunk);
        break;
      } catch (err) {
        attempts += 1;
        const msg = err instanceof Error ? err.message : String(err);
        if (attempts >= 3 || !/timeout|reset|ECONN|fetch failed/i.test(msg)) {
          throw err;
        }
        const wait = 1000 * attempts;
        console.log(`  · retry chunk ${i / chunkSize + 1} after ${wait}ms (${msg})`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    if ((i / chunkSize) % 25 === 0) {
      const pct = ((total / rows.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(`  · ${total}/${rows.length} (${pct}%) — ${elapsed}s elapsed`);
    }
  }
  return total;
}

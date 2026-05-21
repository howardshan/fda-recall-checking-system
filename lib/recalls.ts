import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenFdaEnforcementRecord, RecallRow } from "./types";

/**
 * Convert OpenFDA date strings ("YYYYMMDD") to ISO date ("YYYY-MM-DD").
 * Returns null if input is missing or unparseable.
 */
export function normalizeOpenFdaDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function first<T>(arr: T[] | undefined | null): T | null {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

function emptyToNull(s: string | undefined | null): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length === 0 ? null : t;
}

export function normalizeEnforcementRecord(
  rec: OpenFdaEnforcementRecord,
): RecallRow | null {
  const recallNumber = emptyToNull(rec.recall_number);
  if (!recallNumber) return null;
  const o = rec.openfda ?? {};
  return {
    recall_number: recallNumber,
    recalling_firm: emptyToNull(rec.recalling_firm),
    product_description: emptyToNull(rec.product_description),
    brand_name: emptyToNull(first(o.brand_name)),
    generic_name: emptyToNull(first(o.generic_name)),
    manufacturer_name: emptyToNull(first(o.manufacturer_name)),
    product_ndc: Array.isArray(o.product_ndc) && o.product_ndc.length > 0 ? o.product_ndc : null,
    package_ndc: Array.isArray(o.package_ndc) && o.package_ndc.length > 0 ? o.package_ndc : null,
    reason_for_recall: emptyToNull(rec.reason_for_recall),
    classification: emptyToNull(rec.classification),
    status: emptyToNull(rec.status),
    recall_initiation_date: normalizeOpenFdaDate(rec.recall_initiation_date),
    code_info: emptyToNull(rec.code_info),
    distribution_pattern: emptyToNull(rec.distribution_pattern),
    raw: rec,
  };
}

export async function upsertRecallsBatch(
  supabase: SupabaseClient,
  rows: RecallRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await supabase
    .from("recalls")
    .upsert(rows, { onConflict: "recall_number", count: "exact" });
  if (error) throw new Error(`recalls upsert failed: ${error.message}`);
  return count ?? rows.length;
}

export async function upsertRecallsChunked(
  supabase: SupabaseClient,
  rows: RecallRow[],
  chunkSize = 500,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    total += await upsertRecallsBatch(supabase, chunk);
  }
  return total;
}

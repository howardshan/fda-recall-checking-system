import type { SupabaseClient } from "@supabase/supabase-js";

const LABELER_STOPWORDS = new Set([
  "inc", "llc", "ltd", "limited", "corp", "corporation", "co", "company",
  "gmbh", "sa", "ag", "spa", "kg", "bv", "nv", "plc", "the",
  "pharmaceuticals", "pharmaceutical", "pharma", "pharmacy",
  "industries", "industry", "international", "global", "group",
  "holdings", "holding", "trading", "services", "manufacturing",
  "rx", "only", "drug", "drugs",
  "usa", "america", "american", "united", "states", "us", "eu", "uk",
]);

function manufacturerTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['`]+/g, "")
    .replace(/[^a-z]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !LABELER_STOPWORDS.has(t));
}

function manufacturerOverlap(userMfr: string, catalogName: string): number {
  const u = manufacturerTokens(userMfr);
  if (u.length === 0) return 0;
  const f = new Set(manufacturerTokens(catalogName));
  let hits = 0;
  for (const t of u) if (f.has(t)) hits++;
  const minHits = Math.max(1, Math.ceil(u.length / 2));
  return hits >= minHits ? hits : 0;
}

type LabelerRow = { labeler_name: string; source?: string };

/**
 * Returns true when the manufacturer appears in our NDC/recall directory for
 * the given product (same logic as the typeahead sources).
 */
export async function isManufacturerKnown(
  supabase: SupabaseClient,
  productName: string,
  manufacturer: string,
): Promise<boolean> {
  const product = productName.trim();
  const mfr = manufacturer.trim();
  if (!product || !mfr) return false;

  const { data, error } = await supabase.rpc("labelers_for_product", {
    product_name: product,
    query: "",
    max_results: 100,
  });
  if (error) {
    console.error("[manufacturer-verify] rpc failed:", error.message);
    return false;
  }

  const rows = (data ?? []) as LabelerRow[];
  for (const row of rows) {
    if (!row.labeler_name) continue;
    if (manufacturerOverlap(mfr, row.labeler_name) > 0) return true;
    if (row.labeler_name.toLowerCase().includes(mfr.toLowerCase())) return true;
    if (mfr.toLowerCase().includes(row.labeler_name.toLowerCase())) return true;
  }
  return false;
}

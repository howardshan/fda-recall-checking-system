import type { SupabaseClient } from "@supabase/supabase-js";
import { lotInCodeInfo } from "./lot-match";

export type CheckRecallInput = {
  productName: string;
  manufacturer?: string | null;
  ndc?: string | null;
  lotNumber?: string | null;
};

export type RecallMatch = {
  id: number;
  recallNumber: string;
  recallingFirm: string | null;
  productDescription: string | null;
  brandName: string | null;
  genericName: string | null;
  manufacturerName: string | null;
  reasonForRecall: string | null;
  classification: string | null;
  status: string | null;
  recallInitiationDate: string | null;
  codeInfo: string | null;
  distributionPattern: string | null;
  productNdc: string[] | null;
  packageNdc: string[] | null;
  productScore: number;
  firmScore: number;
  ndcExact: boolean;
  lotMatch: boolean | null;
};

export type CheckRecallStatus = "recalled" | "possible" | "not_found";

export type CheckRecallResult = {
  status: CheckRecallStatus;
  matches: RecallMatch[];
  query: CheckRecallInput;
  /**
   * True when the search was confined to the user-provided NDC and that NDC
   * is not in any recall record. Lets the UI show a more specific hint than
   * the generic not_found case.
   */
  ndcSearched?: boolean;
};

// lotInCodeInfo now lives in lib/lot-match.ts (with unit tests) — handles
// ranges, lists, and the "All Lots" wildcard properly. Import at top.

type RecallDbRow = {
  id: number;
  recall_number: string;
  recalling_firm: string | null;
  product_description: string | null;
  brand_name: string | null;
  generic_name: string | null;
  manufacturer_name: string | null;
  reason_for_recall: string | null;
  classification: string | null;
  status: string | null;
  recall_initiation_date: string | null;
  code_info: string | null;
  distribution_pattern: string | null;
  product_ndc: string[] | null;
  package_ndc: string[] | null;
};

type RecallFuzzyRow = RecallDbRow & {
  product_score: number;
  firm_score: number;
};

function toMatch(
  row: RecallFuzzyRow,
  opts: { ndcExact: boolean; lotMatch: boolean | null },
): RecallMatch {
  return {
    id: row.id,
    recallNumber: row.recall_number,
    recallingFirm: row.recalling_firm,
    productDescription: row.product_description,
    brandName: row.brand_name,
    genericName: row.generic_name,
    manufacturerName: row.manufacturer_name,
    reasonForRecall: row.reason_for_recall,
    classification: row.classification,
    status: row.status,
    recallInitiationDate: row.recall_initiation_date,
    codeInfo: row.code_info,
    distributionPattern: row.distribution_pattern,
    productNdc: row.product_ndc,
    packageNdc: row.package_ndc,
    productScore: row.product_score ?? 0,
    firmScore: row.firm_score ?? 0,
    ndcExact: opts.ndcExact,
    lotMatch: opts.lotMatch,
  };
}

async function ndcExactMatches(
  supabase: SupabaseClient,
  ndc: string,
): Promise<RecallDbRow[]> {
  const normalized = ndc.trim();
  // Search both product_ndc and package_ndc arrays for exact membership.
  const { data, error } = await supabase
    .from("recalls")
    .select(
      "id, recall_number, recalling_firm, product_description, brand_name, generic_name, manufacturer_name, reason_for_recall, classification, status, recall_initiation_date, code_info, distribution_pattern, product_ndc, package_ndc",
    )
    .or(`product_ndc.cs.{${normalized}},package_ndc.cs.{${normalized}}`)
    .limit(20);
  if (error) throw new Error(`recalls NDC lookup failed: ${error.message}`);
  return (data ?? []) as RecallDbRow[];
}

async function exactProductMatches(
  supabase: SupabaseClient,
  productPhrase: string,
): Promise<RecallDbRow[]> {
  const { data, error } = await supabase.rpc("recalls_exact_product_match", {
    product_phrase: productPhrase.toLowerCase(),
  });
  if (error)
    throw new Error(`recalls_exact_product_match failed: ${error.message}`);
  return (data ?? []) as RecallDbRow[];
}

// Manufacturer name → distinctive tokens for whole-word overlap checks.
// Mirrors the labeler-tokenization in lib/ngram-match.ts so that "Dr. Reddy's
// Laboratories Limited" (NDC dictionary) is recognized as the same company as
// "Dr. Reddy's Laboratories, Inc." (recall record).
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

function manufacturerOverlap(
  userMfr: string,
  recallFirm: string | null,
): { hits: number; total: number } {
  if (!recallFirm) return { hits: 0, total: 0 };
  const u = manufacturerTokens(userMfr);
  if (u.length === 0) return { hits: 0, total: 0 };
  const f = new Set(manufacturerTokens(recallFirm));
  let hits = 0;
  for (const t of u) if (f.has(t)) hits++;
  return { hits, total: u.length };
}

export async function checkRecall(
  supabase: SupabaseClient,
  input: CheckRecallInput,
): Promise<CheckRecallResult> {
  const productName = input.productName?.trim() ?? "";
  const manufacturer = input.manufacturer?.trim() || null;
  const ndc = input.ndc?.trim() || null;
  const lot = input.lotNumber?.trim() || null;

  // 1. NDC path. When the user provides an NDC we trust it absolutely — either
  // there is a recall for that exact NDC (recalled / possible), or there isn't
  // (not_found). We do NOT fall through to fuzzy text search, which would dump
  // recalls from every other manufacturer's version of the same drug onto a
  // user who already gave us a precise identifier.
  if (ndc) {
    const ndcRows = await ndcExactMatches(supabase, ndc);
    if (ndcRows.length === 0) {
      return { status: "not_found", matches: [], query: input, ndcSearched: true };
    }
    const matches = ndcRows.map((r) =>
      toMatch(
        { ...r, product_score: 1, firm_score: 1 },
        {
          ndcExact: true,
          lotMatch: lot ? lotInCodeInfo(lot, r.code_info) : null,
        },
      ),
    );
    // Lot provided but none of the matched recalls cover it → the affected
    // lot may not include the user's bottle. Downgrade to possible.
    const lotHits = matches.filter((m) => m.lotMatch === true);
    const status: CheckRecallStatus =
      lot && lotHits.length === 0 ? "possible" : "recalled";
    return { status, matches, query: input };
  }

  // 2. Whole-word exact match path. The product phrase must appear as a
  // complete word in brand_name / generic_name / product_description — no
  // trigram fuzziness, so "sirolimus" can't accidentally drag in
  // "tacrolimus" via the shared "-rolimus" suffix.
  if (!productName) {
    return { status: "not_found", matches: [], query: input };
  }
  const rows = await exactProductMatches(supabase, productName);
  if (rows.length === 0) {
    return { status: "not_found", matches: [], query: input };
  }

  let visible: RecallMatch[] = rows.map((r) => {
    const overlap = manufacturer
      ? manufacturerOverlap(manufacturer, r.recalling_firm)
      : { hits: 0, total: 0 };
    return toMatch(
      {
        ...r,
        product_score: 1,
        firm_score: overlap.total > 0 ? overlap.hits / overlap.total : 0,
      },
      {
        ndcExact: false,
        lotMatch: lot ? lotInCodeInfo(lot, r.code_info) : null,
      },
    );
  });

  // When the user supplied a manufacturer, require a meaningful overlap with
  // the recalling firm. ≥ ceil(half) of the user's distinctive tokens must
  // appear in the firm — handles registry name variants ("Dr. Reddy's
  // Laboratories Limited" ↔ "Dr. Reddy's Laboratories, Inc.").
  if (manufacturer) {
    const userTokenCount = manufacturerTokens(manufacturer).length;
    const minHits = Math.max(1, Math.ceil(userTokenCount / 2));
    visible = visible.filter((m) => {
      const o = manufacturerOverlap(manufacturer, m.recallingFirm);
      return o.hits >= minHits;
    });
  }

  if (visible.length === 0) {
    return { status: "not_found", matches: [], query: input };
  }

  // Status:
  //   - lot provided but no match's code_info covers it → possible
  //   - manufacturer not provided → possible (we have product hits but no
  //     way to confirm it's the user's specific drug)
  //   - otherwise → recalled (exact product + firm match)
  const lotMismatch = lot && !visible.some((m) => m.lotMatch === true);
  const status: CheckRecallStatus =
    lotMismatch || !manufacturer ? "possible" : "recalled";
  return { status, matches: visible, query: input };
}

export async function getLastSyncedAt(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase
    .from("sync_runs")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1);
  return (data?.[0]?.finished_at as string | null) ?? null;
}

export async function logQuery(
  supabase: SupabaseClient,
  input: CheckRecallInput,
  status: CheckRecallStatus,
  inputMethod: "manual" | "photo" | "barcode",
): Promise<void> {
  await supabase.from("query_logs").insert({
    input_method: inputMethod,
    input_product: input.productName ?? null,
    input_manufacturer: input.manufacturer ?? null,
    input_ndc: input.ndc ?? null,
    input_lot: input.lotNumber ?? null,
    result_status: status,
  });
}

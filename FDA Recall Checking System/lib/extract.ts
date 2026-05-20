import type { SupabaseClient } from "@supabase/supabase-js";
import { parseBarcode } from "./gtin";
import { ngramMatch } from "./ngram-match";

export type OcrLine = {
  text: string;
  bbox?: { x: number; y: number; w: number; h: number };
  confidence?: number;
};

export type ExtractInput = {
  ocrText?: string;
  ocrLines?: OcrLine[];
  barcodeRaw?: string;
  ndc?: string;
};

export type ExtractCandidate = {
  productNdc: string | null;
  genericName: string | null;
  brandName: string | null;
  labelerName: string | null;
  dosageForm: string | null;
  productScore: number;
  labelerScore: number;
  combinedScore: number;
  anchorMatch: boolean;
};

export type ExtractResult = {
  productName: string | null;
  manufacturer: string | null;
  ndc: string | null;
  lotNumber: string | null;
  confidence: number;
  source: "ndc" | "barcode" | "ocr" | "manual" | "none";
  candidates: ExtractCandidate[];
};

const NDC_RE = /\b(\d{4,5})[-\s](\d{3,4})[-\s](\d{1,2})\b/;
const LOT_RE = /\b(?:LOT|Lot|LT)[\s#:.\-]*([A-Z0-9][A-Z0-9-]{2,15})\b/;
const ANCHOR_LABELER_RE =
  /\b(?:mfr|mfg|manufactured\s+(?:by|for)|mfd\s+by|distributed\s+by|distributor)[\s:.\-]*([a-z0-9][a-z0-9 &.,'-]{2,80})/i;

// US pharmacy / retail chains that show up as labeler_name in the NDC dictionary
// because they sell store-brand drugs, but on a pharmacy bottle the chain name is
// the dispenser, not the actual manufacturer the user is asking about. We
// downweight these in OCR scoring so real-manufacturer candidates float up.
const PHARMACY_CHAIN_PATTERNS = [
  "cvs ",
  "kroger",
  "walgreens",
  "walmart",
  "wal-mart",
  "costco",
  "rite aid",
  "rite-aid",
  "publix",
  "albertsons",
  "safeway",
  "meijer",
  " heb ",
  "h-e-b",
  "target corp",
  "duane reade",
];

function isPharmacyChainLabeler(name: string | null): boolean {
  if (!name) return false;
  const padded = ` ${name.toLowerCase()} `;
  return PHARMACY_CHAIN_PATTERNS.some((p) => padded.includes(p));
}

// Tokens that are not drug names but appear constantly on pharmacy labels
// (and would explode the trigram candidate set). Lowercase + letters-only.
const OCR_NOISE_TOKENS = new Set([
  // pharmacy chain names — these would otherwise match thousands of
  // store-brand NDCs and dominate the fuzzy candidate set.
  "kroger", "cvs", "walgreens", "walmart", "costco", "publix", "albertsons",
  "safeway", "meijer", "heb", "duane", "reade", "rite", "aid", "riteaid",
  "target", "wegmans", "winn", "dixie", "sam", "sams", "club",
  // generic pharma-label vocabulary
  "take", "tablet", "tablets", "capsule", "capsules", "cap", "caps", "tab",
  "tabs", "by", "mouth", "daily", "twice", "once", "thrice", "before",
  "after", "meals", "meal", "every", "hours", "hour", "hrs", "needed",
  "needed", "with", "without", "food", "water", "use", "as", "directed",
  "directed", "the", "and", "per", "for", "pain", "may", "cause",
  // prescription metadata
  "prescriber", "pharmacy", "patient", "rx", "refills", "refill",
  "discard", "after", "fill", "filled", "filling", "qty", "quantity",
  "expires", "exp", "store", "below", "above", "see", "label",
  // dosage strength suffixes (the number "5" + "mg" gets stripped already
  // by letters-only filter; the unit token itself is too generic to keep)
  "mg", "mcg", "ml", "gm", "iu", "units",
  // common patient-instruction phrasing
  "this", "your", "doctor", "physician", "warning", "do", "not", "shake",
  "well", "before", "using", "refrigerate",
]);

// Lines that are pure metadata (phone, Rx#, dosing) — drop wholesale so we
// don't leak digits or fragments through the letters-only filter.
const NOISE_LINE_PATTERNS = [
  /^\s*\(?\d{3}\)?[\s\-.]*\d{3}[\s\-.]*\d{4}/, // US phone numbers
  /^\s*rx\s*#/i,
  /^\s*\d+\.?\d*\s+refills?/i,
  /^\s*take\s+\d+/i,
  /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/, // dates
];

/**
 * Strip noise from pharmacy-bottle OCR before sending it to ndc_fuzzy_search.
 * Pharmacy labels carry a lot of text that is irrelevant to drug identification
 * (chain name, dosing instructions, patient name, Rx number) and trigram-
 * matches into the NDC dictionary expensively. We keep only letter tokens of
 * length >= 3 that aren't in our pharma-noise stopword set.
 *
 * Cap output to 200 chars — even after cleaning, very long inputs blow up the
 * per-row scoring in the RPC's CTE.
 */
export function cleanOcrTextForFuzzy(raw: string): string {
  const lines = raw.split(/[\r\n]+/);
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 2) continue;
    if (NOISE_LINE_PATTERNS.some((p) => p.test(t))) continue;
    for (const rawTok of t.split(/[\s,.;:()\[\]<>/\\]+/)) {
      const tok = rawTok.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (tok.length < 3) continue;
      if (OCR_NOISE_TOKENS.has(tok)) continue;
      if (seen.has(tok)) continue;
      seen.add(tok);
      kept.push(tok);
    }
  }
  return kept.join(" ").slice(0, 200);
}

export function extractNdcFromText(text: string): string | null {
  const m = text.match(NDC_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function extractLotFromText(text: string): string | null {
  const m = text.match(LOT_RE);
  return m ? m[1] : null;
}

export function extractLabelerAnchor(text: string): string | null {
  const m = text.match(ANCHOR_LABELER_RE);
  if (!m) return null;
  return m[1].trim().replace(/[.,]+$/, "");
}

/**
 * Normalize NDC strings. OpenFDA stores NDCs in formats like "12345-678-90"
 * (3-segment 10-digit) and "12345-6789" (2-segment 10-digit). We normalize to
 * the 3-segment form when possible, otherwise return the trimmed input.
 */
export function normalizeNdc(input: string): string {
  return input.trim().replace(/[\s]/g, "");
}

type FuzzyRow = {
  product_ndc: string | null;
  generic_name: string | null;
  brand_name: string | null;
  labeler_name: string | null;
  dosage_form: string | null;
  product_score: number;
  labeler_score: number;
};

async function fuzzySearchNdc(
  supabase: SupabaseClient,
  query: string,
  threshold = 0.4,
  maxResults = 20,
): Promise<FuzzyRow[]> {
  const { data, error } = await supabase.rpc("ndc_fuzzy_search", {
    query,
    threshold,
    max_results: maxResults,
  });
  if (error) throw new Error(`ndc_fuzzy_search RPC failed: ${error.message}`);
  return (data ?? []) as FuzzyRow[];
}

function scoreCandidate(
  row: FuzzyRow,
  ocrText: string,
): ExtractCandidate {
  const productScore = row.product_score ?? 0;
  let labelerScore = row.labeler_score ?? 0;
  let anchorMatch = false;

  // Anchor keyword bonus: if OCR contains "Manufactured by <labeler>" or
  // similar phrase whose match includes this labeler, bump labelerScore.
  if (row.labeler_name) {
    const labelerLower = row.labeler_name.toLowerCase();
    const anchorPhrase = extractLabelerAnchor(ocrText);
    if (anchorPhrase) {
      const anchorLower = anchorPhrase.toLowerCase();
      if (
        labelerLower.startsWith(anchorLower) ||
        anchorLower.startsWith(labelerLower) ||
        anchorLower.includes(labelerLower.split(/\s+/)[0])
      ) {
        labelerScore = Math.min(1, labelerScore + 0.2);
        anchorMatch = true;
      }
    }
  }

  const base = productScore * 0.7 + labelerScore * 0.3;
  const combinedScore = isPharmacyChainLabeler(row.labeler_name)
    ? Math.max(0, base - 0.35)
    : base;

  return {
    productNdc: row.product_ndc,
    genericName: row.generic_name,
    brandName: row.brand_name,
    labelerName: row.labeler_name,
    dosageForm: row.dosage_form,
    productScore,
    labelerScore,
    combinedScore,
    anchorMatch,
  };
}

export async function extractFromNdc(
  supabase: SupabaseClient,
  ndc: string,
): Promise<ExtractResult> {
  const normalized = normalizeNdc(ndc);
  const { data, error } = await supabase
    .from("ndc_products")
    .select("product_ndc, generic_name, brand_name, labeler_name, dosage_form")
    .eq("product_ndc", normalized)
    .limit(5);
  if (error) throw new Error(`ndc lookup failed: ${error.message}`);
  const rows = data ?? [];
  if (rows.length === 0) {
    return {
      productName: null,
      manufacturer: null,
      ndc: normalized,
      lotNumber: null,
      confidence: 0,
      source: "ndc",
      candidates: [],
    };
  }
  const top = rows[0];
  const candidates: ExtractCandidate[] = rows.map((r) => ({
    productNdc: r.product_ndc as string | null,
    genericName: r.generic_name as string | null,
    brandName: r.brand_name as string | null,
    labelerName: r.labeler_name as string | null,
    dosageForm: r.dosage_form as string | null,
    productScore: 1,
    labelerScore: 1,
    combinedScore: 1,
    anchorMatch: false,
  }));
  return {
    productName:
      (top.brand_name as string | null) || (top.generic_name as string | null),
    manufacturer: top.labeler_name as string | null,
    ndc: top.product_ndc as string | null,
    lotNumber: null,
    confidence: 1,
    source: "ndc",
    candidates,
  };
}

export async function extractFromOcr(
  supabase: SupabaseClient,
  ocrText: string,
): Promise<ExtractResult> {
  const original = ocrText.replace(/\s+/g, " ").trim();
  if (!original) {
    return emptyResult("ocr");
  }

  // NDC and lot regexes run against the original text — they need the digits
  // and original casing that token processing strips.
  const ndcFromText = extractNdcFromText(original);
  const lotFromText = extractLotFromText(original);

  if (ndcFromText) {
    const viaNdc = await extractFromNdc(supabase, ndcFromText);
    return { ...viaNdc, lotNumber: viaNdc.lotNumber ?? lotFromText, source: "ocr" };
  }

  // N-gram window match: tokenize OCR text, find longest matching 1/2/3-gram
  // phrases against the NDC dictionary (brand_name / generic_name), then use
  // labeler matches to disambiguate when multiple manufacturers' products fit.
  const { candidates: ngCandidates, matchedLabelers } = await ngramMatch(
    supabase,
    ocrText,
  );

  if (ngCandidates.length === 0) {
    return {
      productName: null,
      manufacturer: null,
      ndc: null,
      lotNumber: lotFromText,
      confidence: 0,
      source: "ocr",
      candidates: [],
    };
  }

  // The matchedNgramSize doubles as a rough confidence signal — 3-word
  // matches are way more specific than 1-word.
  const ngramConfidence = (n: number) => Math.min(1, 0.45 + 0.2 * n);

  const candidates: ExtractCandidate[] = ngCandidates.map((c) => ({
    productNdc: c.productNdc,
    genericName: c.genericName,
    brandName: c.brandName,
    labelerName: c.labelerName,
    dosageForm: c.dosageForm,
    productScore: ngramConfidence(c.matchedNgramSize),
    labelerScore: 0,
    combinedScore: ngramConfidence(c.matchedNgramSize),
    anchorMatch: false,
  }));

  const top = candidates[0];

  // Only fill manufacturer + NDC when the labeler match was actually
  // confident (a distinctive labeler-token hit in OCR). Otherwise leave
  // them null — better an empty field the user can complete via the
  // candidates dropdown than a guessed manufacturer that's wrong.
  const labelerConfident = matchedLabelers.size > 0;

  return {
    productName: top.brandName || top.genericName,
    manufacturer: labelerConfident ? top.labelerName : null,
    ndc: labelerConfident ? top.productNdc : null,
    lotNumber: lotFromText,
    confidence: labelerConfident ? top.combinedScore : top.combinedScore * 0.5,
    source: "ocr",
    candidates: candidates.slice(0, 8),
  };
}

function emptyResult(source: ExtractResult["source"]): ExtractResult {
  return {
    productName: null,
    manufacturer: null,
    ndc: null,
    lotNumber: null,
    confidence: 0,
    source,
    candidates: [],
  };
}

/**
 * Resolve a barcode payload (UPC-A / EAN-13 / GTIN-14 / GS1 DataMatrix) to an
 * NDC + optional lot. Tries each plausible dashed NDC format against the
 * ndc_products dictionary; if none match, returns the parsed NDC anyway so the
 * caller can still query /api/check-recall by NDC.
 */
export async function extractFromBarcode(
  supabase: SupabaseClient,
  rawBarcode: string,
): Promise<ExtractResult> {
  const parsed = parseBarcode(rawBarcode);
  if (parsed.ndcCandidates.length === 0) {
    // Pharmacy bottle barcode (Rx number), unknown GS1 prefix, or junk.
    return { ...emptyResult("barcode"), lotNumber: parsed.lot };
  }

  // Query the dictionary for any candidate dashed form.
  const { data, error } = await supabase
    .from("ndc_products")
    .select("product_ndc, generic_name, brand_name, labeler_name, dosage_form")
    .in("product_ndc", parsed.ndcCandidates)
    .limit(5);
  if (error) throw new Error(`barcode NDC lookup failed: ${error.message}`);
  const rows = data ?? [];

  if (rows.length === 0) {
    // We have an NDC but the dictionary doesn't know it (rare — could be
    // a private-label product or a stale dictionary). Return the first
    // candidate so /api/check-recall can still query recalls by NDC.
    return {
      productName: null,
      manufacturer: null,
      ndc: parsed.ndcCandidates[0],
      lotNumber: parsed.lot,
      confidence: 0.5,
      source: "barcode",
      candidates: [],
    };
  }

  const top = rows[0];
  const candidates: ExtractCandidate[] = rows.map((r) => ({
    productNdc: r.product_ndc as string | null,
    genericName: r.generic_name as string | null,
    brandName: r.brand_name as string | null,
    labelerName: r.labeler_name as string | null,
    dosageForm: r.dosage_form as string | null,
    productScore: 1,
    labelerScore: 1,
    combinedScore: 1,
    anchorMatch: false,
  }));
  return {
    productName:
      (top.brand_name as string | null) || (top.generic_name as string | null),
    manufacturer: top.labeler_name as string | null,
    ndc: top.product_ndc as string | null,
    lotNumber: parsed.lot,
    confidence: 1,
    source: "barcode",
    candidates,
  };
}

export async function extractAny(
  supabase: SupabaseClient,
  input: ExtractInput,
): Promise<ExtractResult> {
  if (input.ndc) {
    return extractFromNdc(supabase, input.ndc);
  }
  if (input.barcodeRaw) {
    return extractFromBarcode(supabase, input.barcodeRaw);
  }
  if (input.ocrText) {
    return extractFromOcr(supabase, input.ocrText);
  }
  return emptyResult("none");
}

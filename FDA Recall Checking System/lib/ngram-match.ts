/**
 * N-gram window match for OCR text → NDC dictionary.
 *
 * Algorithm:
 *   1. Tokenize OCR text into groups of contiguous "interesting" words
 *      (drop noise tokens like RX#, pharmacy chain names, dosing words —
 *      these *break* the sequence so no n-gram spans them).
 *   2. For each starting position, generate 1/2/3-word phrases.
 *   3. Look up all phrases in the NDC dictionary in one batched RPC.
 *   4. Per starting position, keep the LONGEST phrase that has matches.
 *      Skip ahead by that length. Forward maximum match.
 *   5. Collect unique drug candidates across all positions.
 *   6. If multiple distinct labelers across candidates, run the same scan
 *      against labeler_name → intersect the two candidate sets to pick the
 *      drug+labeler pair the user actually has in front of them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// Tokens that aren't drug names and would generate noise n-grams. These
// also act as *break points* — n-grams don't span across a dropped token.
const NOISE_TOKENS = new Set([
  // generic country / region words — too broad on their own to discriminate
  "usa", "america", "american", "united", "states",
  // pharmacy/retail chains
  "kroger", "cvs", "walgreens", "walmart", "costco", "publix", "albertsons",
  "safeway", "meijer", "heb", "duane", "reade", "rite", "aid", "riteaid",
  "target", "wegmans", "sam", "sams", "club", "winn", "dixie",
  // generic pharma vocabulary
  "take", "tablet", "tablets", "capsule", "capsules", "cap", "caps", "tab",
  "tabs", "mouth", "daily", "twice", "once", "thrice", "before",
  "after", "meals", "meal", "every", "hours", "hour", "hrs", "needed",
  "with", "without", "food", "water", "use", "as", "directed",
  "the", "per", "for", "may", "cause", "see",
  // prescription metadata
  "prescriber", "pharmacy", "patient", "refills", "refill",
  "discard", "fill", "filled", "filling", "qty", "quantity",
  "expires", "exp", "store", "below", "above", "label",
  // dosing units
  "mg", "mcg", "ml", "iu", "units",
  // common patient-instruction phrasing
  "this", "your", "doctor", "physician", "warning", "shake",
  "well", "using", "refrigerate", "side", "effects",
  // OCR garbage that's commonly misread
  "the", "and", "with", "for", "or",
  // bottle/label words
  "rxonly", "only", "made", "manufactured", "distributed",
]);

// Lines that are pure metadata — drop wholesale.
const NOISE_LINE_PATTERNS = [
  /^\s*\(?\d{3}\)?[\s\-.]*\d{3}[\s\-.]*\d{4}/, // phone numbers
  /^\s*rx\s*#/i,
  /^\s*\d+\.?\d*\s+refills?/i,
  /^\s*take\s+\d+/i,
  /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/, // dates
];

const MIN_TOKEN_LEN = 3;
const MAX_NGRAM = 3;

/**
 * Tokenize OCR text into groups of contiguous interesting tokens.
 * Each group is a list of clean lowercase tokens. N-grams are generated only
 * within a group so they never span across a noise break.
 */
export function tokenizeIntoGroups(text: string): string[][] {
  const lines = text.split(/[\r\n]+/);
  const groups: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) {
      groups.push(current);
      current = [];
    }
  };
  for (const line of lines) {
    if (NOISE_LINE_PATTERNS.some((p) => p.test(line.trim()))) {
      flush();
      continue;
    }
    for (const raw of line.split(/[\s,.;:()[\]<>/\\|]+/)) {
      const tok = raw.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (tok.length < MIN_TOKEN_LEN) {
        flush();
        continue;
      }
      if (NOISE_TOKENS.has(tok)) {
        flush();
        continue;
      }
      current.push(tok);
    }
    flush(); // line break also breaks the group
  }
  flush();
  return groups;
}

export type Phrase = {
  phrase: string;
  groupIdx: number;
  posInGroup: number;
  n: number;
};

export function generatePhrases(groups: string[][]): Phrase[] {
  const phrases: Phrase[] = [];
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    for (let i = 0; i < group.length; i++) {
      for (let n = 1; n <= MAX_NGRAM && i + n <= group.length; n++) {
        phrases.push({
          phrase: group.slice(i, i + n).join(" "),
          groupIdx: g,
          posInGroup: i,
          n,
        });
      }
    }
  }
  return phrases;
}

export type DrugMatch = {
  productNdc: string | null;
  brandName: string | null;
  genericName: string | null;
  labelerName: string | null;
  dosageForm: string | null;
  matchedPhrase: string;
  matchedNgramSize: number;
};

type DrugRow = {
  phrase: string;
  product_ndc: string | null;
  brand_name: string | null;
  generic_name: string | null;
  labeler_name: string | null;
  dosage_form: string | null;
};

/**
 * Run the algorithm. Returns ordered drug candidates — higher confidence
 * (longer matched phrase + manufacturer cross-confirmation) first.
 */
export async function ngramMatch(
  supabase: SupabaseClient,
  ocrText: string,
): Promise<{
  groups: string[][];
  candidates: DrugMatch[];
  drugCandidatesBeforeDisambig: DrugMatch[];
  matchedLabelers: Set<string>;
}> {
  const groups = tokenizeIntoGroups(ocrText);
  const phrases = generatePhrases(groups);
  if (phrases.length === 0) {
    return {
      groups,
      candidates: [],
      drugCandidatesBeforeDisambig: [],
      matchedLabelers: new Set(),
    };
  }

  // Dedupe phrases for the batched RPC call.
  const uniquePhrases = Array.from(new Set(phrases.map((p) => p.phrase)));

  // Drug scan first. Once we have candidate drugs, the set of possible
  // manufacturers is finite — not every labeler makes this drug. We do the
  // labeler match in JS against ONLY that small set rather than against the
  // full 134k-row labeler space. This is both faster and more precise:
  // a token like "limited" can't drag in a wrong labeler that doesn't
  // make the drug.
  const { data, error } = await supabase.rpc("drug_phrase_lookup", {
    phrases: uniquePhrases,
    per_phrase_limit: 300,
  });
  if (error) throw new Error(`drug_phrase_lookup failed: ${error.message}`);

  const phraseToRows = new Map<string, DrugRow[]>();
  for (const row of (data ?? []) as DrugRow[]) {
    if (!phraseToRows.has(row.phrase)) phraseToRows.set(row.phrase, []);
    phraseToRows.get(row.phrase)!.push(row);
  }

  // Forward maximum match per starting position. For each (group, position),
  // pick the LARGEST n whose phrase has matches.
  type PositionKey = string;
  const longestAtPos = new Map<PositionKey, { n: number; phrase: string }>();
  for (const p of phrases) {
    const rows = phraseToRows.get(p.phrase);
    if (!rows || rows.length === 0) continue;
    const key = `${p.groupIdx}:${p.posInGroup}`;
    const existing = longestAtPos.get(key);
    if (!existing || p.n > existing.n) {
      longestAtPos.set(key, { n: p.n, phrase: p.phrase });
    }
  }

  // Dedupe drug candidates by (brand|generic|labeler). Prefer the longest
  // matched n-gram for each candidate.
  const candidateMap = new Map<string, DrugMatch>();
  for (const { n, phrase } of longestAtPos.values()) {
    const rows = phraseToRows.get(phrase) ?? [];
    for (const r of rows) {
      const key = `${r.brand_name}|${r.generic_name}|${r.labeler_name}`;
      const existing = candidateMap.get(key);
      if (!existing || n > existing.matchedNgramSize) {
        candidateMap.set(key, {
          productNdc: r.product_ndc,
          brandName: r.brand_name,
          genericName: r.generic_name,
          labelerName: r.labeler_name,
          dosageForm: r.dosage_form,
          matchedPhrase: phrase,
          matchedNgramSize: n,
        });
      }
    }
  }

  const drugCandidatesBeforeDisambig = Array.from(candidateMap.values()).sort(
    (a, b) => b.matchedNgramSize - a.matchedNgramSize,
  );

  // Constrained labeler match: scan ONLY the labelers that already make this
  // drug (small set, usually <100) against the OCR token bag, with IDF
  // weighting so common words like "pharmaceuticals" don't outweigh
  // distinctive ones like "reddys".
  const ocrTokenBag = new Set<string>();
  for (const raw of ocrText.split(/[\s,.;:()[\]<>/\\|]+/)) {
    const t = raw.replace(/[^A-Za-z]/g, "").toLowerCase();
    if (t.length >= 2) ocrTokenBag.add(t);
  }

  const matchedLabelers = new Set<string>();
  let candidates = drugCandidatesBeforeDisambig;

  if (drugCandidatesBeforeDisambig.length > 1) {
    const distinctLabelers = Array.from(
      new Set(
        drugCandidatesBeforeDisambig
          .map((c) => c.labelerName)
          .filter((n): n is string => n != null),
      ),
    );

    // Per-token document frequency within the candidate-labeler set.
    const labelerTokens = new Map<string, string[]>();
    const tokenDf = new Map<string, number>();
    for (const labeler of distinctLabelers) {
      const toks = labelerNameToTokens(labeler);
      labelerTokens.set(labeler, toks);
      for (const t of new Set(toks)) {
        tokenDf.set(t, (tokenDf.get(t) ?? 0) + 1);
      }
    }
    const N = distinctLabelers.length;

    // Score each labeler. Score is sum of IDF for each of its tokens found
    // in the OCR. We also flag whether any of those matched tokens was
    // "distinctive" (df ≤ 2) — without a distinctive hit, the match is just
    // noise (e.g. only "pharmaceuticals" overlapping) and we treat it as
    // "manufacturer not determined".
    const scored: {
      labeler: string;
      score: number;
      hasDistinctive: boolean;
    }[] = [];
    for (const labeler of distinctLabelers) {
      const toks = labelerTokens.get(labeler) ?? [];
      let score = 0;
      let hasDistinctive = false;
      for (const t of toks) {
        if (!ocrTokenBag.has(t)) continue;
        const df = tokenDf.get(t) ?? 1;
        const idf = Math.log((N + 1) / df);
        score += idf;
        if (df <= 2) hasDistinctive = true;
      }
      if (score > 0) scored.push({ labeler, score, hasDistinctive });
    }

    const distinctive = scored.filter((s) => s.hasDistinctive);
    if (distinctive.length > 0) {
      distinctive.sort((a, b) => b.score - a.score);
      // Accept the top score and anything within 95% of it (handles tied
      // registry variants of the same company).
      const topScore = distinctive[0].score;
      const winners = new Set(
        distinctive
          .filter((s) => s.score >= topScore * 0.95)
          .map((s) => s.labeler),
      );
      for (const l of winners) matchedLabelers.add(l.toLowerCase());
      const intersect = drugCandidatesBeforeDisambig.filter(
        (c) => c.labelerName != null && winners.has(c.labelerName),
      );
      if (intersect.length > 0) candidates = intersect;
    }
  }

  return { groups, candidates, drugCandidatesBeforeDisambig, matchedLabelers };
}

// Words that show up in many labeler names but aren't distinctive on their
// own — we don't want a labeler whose only OCR-matching word is "company"
// or "pharmaceuticals" to win the disambiguation. Also includes common
// label / Rx vocabulary that appears in OCR for a totally unrelated reason
// (e.g. "Rx Only", country tags) but happens to also live inside some
// manufacturer brand names.
const LABELER_STOPWORDS = new Set([
  // legal-entity suffixes
  "inc", "llc", "ltd", "limited", "corp", "corporation", "co", "company",
  "gmbh", "sa", "ag", "spa", "kg", "bv", "nv", "plc", "the",
  // industry words
  "pharmaceuticals", "pharmaceutical", "pharma", "pharmacy",
  "industries", "industry", "international", "global", "group",
  "holdings", "holding", "trading", "services", "manufacturing",
  // common pharma-label vocabulary that ALSO appears in some brand names
  // (e.g. "NORTHSTAR RX LLC" — "rx" is in their name, but "rx" appearing
  // in OCR is almost always from "Rx Only" / "Rx#", not from the maker)
  "rx", "only", "drug", "drugs",
  // country / region words
  "usa", "america", "american", "united", "states", "us", "eu", "uk",
]);

function labelerNameToTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['`]+/g, "")
    .replace(/[^a-z]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !LABELER_STOPWORDS.has(t));
}

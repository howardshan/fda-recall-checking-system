export type RecallClassTier = "I" | "II" | "III";

const TIER_ORDER: RecallClassTier[] = ["I", "II", "III"];

/** Parse FDA free-text classification (e.g. "Class II") into a tier. */
export function parseRecallClassTier(
  classification: string | null | undefined,
): RecallClassTier | null {
  if (!classification) return null;
  if (/class\s*iii\b/i.test(classification)) return "III";
  if (/class\s*ii\b/i.test(classification)) return "II";
  if (/class\s*i\b/i.test(classification)) return "I";
  return null;
}

export function recallClassLabel(
  classification: string | null | undefined,
): string {
  const tier = parseRecallClassTier(classification);
  if (tier) return `Class ${tier}`;
  if (!classification) return "Unclassified";
  return classification;
}

export function recallClassLabelForTier(tier: RecallClassTier): string {
  return `Class ${tier}`;
}

export function recallClassChipClass(
  classification: string | null | undefined,
): string {
  const tier = parseRecallClassTier(classification);
  if (!tier) return "chip bg-surface-container-high text-on-surface";
  return recallClassChipClassForTier(tier);
}

export function recallClassChipClassForTier(tier: RecallClassTier): string {
  if (tier === "I") return "chip chip-i";
  if (tier === "II") return "chip chip-ii";
  return "chip chip-iii";
}

/** Highest severity first (Class I before II before III). */
export function sortRecallClassTiers(
  tiers: Iterable<RecallClassTier>,
): RecallClassTier[] {
  const set = new Set(tiers);
  return TIER_ORDER.filter((t) => set.has(t));
}

/** Client-side / post-filter check — mirrors the API exclusion rules. */
export function matchesRecallClass(
  classification: string | null | undefined,
  tier: RecallClassTier,
): boolean {
  if (!classification) return false;
  if (/class\s*iii\b/i.test(classification)) return tier === "III";
  if (/class\s*ii\b/i.test(classification)) return tier === "II";
  if (/class\s*i\b/i.test(classification)) return tier === "I";
  return false;
}

type ClassFilterQuery = {
  ilike(column: string, pattern: string): ClassFilterQuery;
  not(column: string, operator: string, value: string): ClassFilterQuery;
};

/**
 * FDA classifications are stored as free text like "Class II".
 * A naive `ILIKE '%Class I%'` also matches Class II and Class III.
 */
export function applyRecallClassFilter<Q extends ClassFilterQuery>(
  query: Q,
  cls: string,
): Q {
  if (cls === "I") {
    return query
      .ilike("classification", "%Class I%")
      .not("classification", "ilike", "%Class II%")
      .not("classification", "ilike", "%Class III%") as Q;
  }
  if (cls === "II") {
    return query
      .ilike("classification", "%Class II%")
      .not("classification", "ilike", "%Class III%") as Q;
  }
  if (cls === "III") {
    return query.ilike("classification", "%Class III%") as Q;
  }
  return query;
}

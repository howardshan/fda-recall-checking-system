export type RecallClassTier = "I" | "II" | "III";

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

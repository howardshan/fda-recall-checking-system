/**
 * Match a user-supplied lot number against the messy free-text `code_info`
 * field from an FDA recall. The previous implementation was a naive substring
 * search which produced false negatives for ranges and false positives for
 * incidental digit overlaps.
 *
 * Real-world code_info samples we need to handle:
 *   - "All Lots"
 *   - "Lot #: 03312022@29, BUD: 6/10/2022"
 *   - "Lots 12345, 12346, and 12347"
 *   - "Lot Numbers: ABC123, ABC124, ABC125"
 *   - "Affected lots: AB1234-AB1240"
 *   - "Lots A12 through A18"
 *   - "All lots distributed between 1/1/2024 and 6/30/2024"
 */

export type ParsedLots = {
  matchAll: boolean;
  literals: string[];
  ranges: { start: string; end: string }[];
};

const ALL_LOTS_RE = /\ball\s+lots?\b/i;

// "Lot" / "Lots" / "Lot #" / "Lot Number" optionally followed by colon / space.
// Captures the next short alphanumeric run as the lot identifier.
const LOT_LITERAL_RE = /\blot(?:s)?\s*(?:#|number(?:s)?|no\.?)?\s*:?\s*([a-z0-9][a-z0-9-]{1,19})/gi;

// "AB1234-AB1240", "12345 to 12350", "A12 through A18"
const LOT_RANGE_RE =
  /\b([a-z0-9]{2,15})\s*(?:-|—|–|to|through|thru)\s*([a-z0-9]{2,15})\b/gi;

/** Returns the longest common alphabetic prefix of two lot strings. */
function commonAlphaPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length) {
    const ca = a[i];
    const cb = b[i];
    if (ca !== cb || !/[a-z]/i.test(ca)) break;
    i++;
  }
  return a.slice(0, i);
}

function numericTail(s: string, prefixLen: number): number | null {
  const tail = s.slice(prefixLen);
  if (!/^\d+$/.test(tail)) return null;
  return Number.parseInt(tail, 10);
}

function isInLotRange(lot: string, start: string, end: string): boolean {
  const a = lot.toLowerCase();
  const s = start.toLowerCase();
  const e = end.toLowerCase();
  // Common prefix should match between bounds. Fall back to lexicographic
  // comparison if the entire range is purely alphanumeric without an obvious
  // numeric tail.
  const prefix = commonAlphaPrefix(s, e);
  if (prefix.length > 0 && !a.toLowerCase().startsWith(prefix)) return false;

  const startNum = numericTail(s, prefix.length);
  const endNum = numericTail(e, prefix.length);
  const lotNum = numericTail(a, prefix.length);

  if (startNum != null && endNum != null && lotNum != null) {
    const lo = Math.min(startNum, endNum);
    const hi = Math.max(startNum, endNum);
    return lotNum >= lo && lotNum <= hi;
  }
  // Lexicographic fallback (handles ranges like "AAA-AAZ" — uncommon).
  const lo = s < e ? s : e;
  const hi = s < e ? e : s;
  return a >= lo && a <= hi;
}

export function parseCodeInfo(codeInfo: string): ParsedLots {
  if (!codeInfo) return { matchAll: false, literals: [], ranges: [] };
  if (ALL_LOTS_RE.test(codeInfo)) {
    return { matchAll: true, literals: [], ranges: [] };
  }
  const literals = new Set<string>();
  const ranges: { start: string; end: string }[] = [];

  for (const m of codeInfo.matchAll(LOT_LITERAL_RE)) {
    literals.add(m[1].toLowerCase());
  }
  for (const m of codeInfo.matchAll(LOT_RANGE_RE)) {
    ranges.push({ start: m[1], end: m[2] });
  }
  return { matchAll: false, literals: Array.from(literals), ranges };
}

/**
 * True if the user's lot is plausibly covered by the recall's code_info.
 * Order of checks (most specific → fuzziest):
 *   1. "All Lots" wildcard
 *   2. Exact literal mention of the lot
 *   3. Lot inside a parsed range
 *   4. User lot starts with a parsed literal (prefix), or vice versa
 *   5. As a last resort, substring match in the raw code_info
 */
export function lotInCodeInfo(userLot: string, codeInfo: string | null): boolean {
  if (!codeInfo) return false;
  const target = userLot.toLowerCase().trim();
  if (target.length < 3) return false;

  const parsed = parseCodeInfo(codeInfo);
  if (parsed.matchAll) return true;

  if (parsed.literals.includes(target)) return true;

  for (const lit of parsed.literals) {
    // Prefix match either direction: "AB1234" provided, "AB" parsed; or "AB" provided, "AB1234" parsed.
    if (target.startsWith(lit) || lit.startsWith(target)) {
      if (Math.min(target.length, lit.length) >= 3) return true;
    }
  }

  for (const r of parsed.ranges) {
    if (isInLotRange(target, r.start, r.end)) return true;
  }

  // Last-resort substring fallback — catches messy free-text we didn't parse.
  // Require the lot to be at least 3 chars to avoid coincidental matches.
  if (target.length >= 3 && codeInfo.toLowerCase().includes(target)) return true;

  return false;
}

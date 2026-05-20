/**
 * GTIN / UPC / EAN / GS1 DataMatrix parsers for US pharmaceutical barcodes.
 *
 * Pharmaceutical NDC encoding in linear barcodes (US, "3" namespace):
 *   - UPC-A (12 digits):  "3" + 10-digit-NDC + check
 *   - EAN-13 (13 digits): "0" + UPC-A             (leading 0 pads to 13)
 *   - GTIN-14 (14 digits): "00" + UPC-A           (leading 00 pads to 14)
 *
 * In all three forms, the 10-digit NDC sits between the "3" indicator
 * and the trailing check digit.
 *
 * Pharmacy bottle barcodes (the *dispense* label, not the manufacturer
 * carton) typically encode the pharmacy's prescription number, not an NDC —
 * the parser returns null in that case and the UI should ask the user to
 * use the manufacturer carton or fall back to OCR/manual.
 *
 * The 10-digit NDC has three possible dashed formats (4-4-2 / 5-3-2 /
 * 5-4-1) and you cannot tell which from the bits alone. We return all
 * plausible dashed candidates so the caller can try them all against
 * the NDC dictionary.
 *
 * GS1 DataMatrix AI parsing handles (01) GTIN, (10) lot, (17) expiry.
 * FNC1 (ASCII 29) terminates variable-length AIs.
 */

const FNC1 = String.fromCharCode(29);

const NDC_GS1_PREFIX = "3"; // US NDC indicator inside the UPC-A.

// Fixed-length GS1 Application Identifiers we care about.
const FIXED_LEN_AIS: Record<string, number> = {
  "01": 14, // GTIN
  "11": 6, // production date YYMMDD
  "13": 6, // packaging date
  "15": 6, // best-before
  "17": 6, // expiry YYMMDD
};

const VARIABLE_LEN_AIS = new Set(["10", "21"]); // lot, serial

/** Mod-10 check digit for UPC/EAN/GTIN-style barcodes. */
export function checkDigit(dataDigits: string): number {
  if (!/^\d+$/.test(dataDigits)) {
    throw new Error("checkDigit: input must be digits only");
  }
  // Multiply from rightmost data digit; alternate ×3, ×1.
  let sum = 0;
  for (let i = 0; i < dataDigits.length; i++) {
    const d = Number.parseInt(dataDigits[dataDigits.length - 1 - i], 10);
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(full: string): boolean {
  if (!/^\d+$/.test(full)) return false;
  if (full.length < 8) return false;
  const data = full.slice(0, -1);
  const given = Number.parseInt(full.slice(-1), 10);
  return checkDigit(data) === given;
}

/**
 * Normalize UPC-A / EAN-13 / GTIN-14 to a 14-digit GTIN-14 string.
 * Pads shorter forms with leading zeros. Validates check digit.
 */
export function normalizeToGtin14(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 0) return null;
  let gtin: string;
  if (digits.length === 14) gtin = digits;
  else if (digits.length === 13) gtin = "0" + digits;
  else if (digits.length === 12) gtin = "00" + digits;
  else if (digits.length === 8) gtin = "000000" + digits;
  else return null;
  if (!isValidGtin(gtin)) return null;
  return gtin;
}

/**
 * Extract a 10-digit NDC (no dashes) from a GTIN-14, if it follows the
 * US NDC encoding pattern ("00" + "3" + NDC10 + check).
 *
 * Returns null when the GTIN is well-formed but does not match the NDC
 * pattern — e.g., GS1 Company Prefix outside the US NDC namespace, or
 * a packaging-level GTIN (indicator > 0).
 */
export function gtin14ToNdc10(gtin14: string): string | null {
  if (!/^\d{14}$/.test(gtin14)) return null;
  if (!isValidGtin(gtin14)) return null;
  // Indicator must be 0 (unit-level) for NDC mapping to apply.
  if (gtin14[0] !== "0") return null;
  // Position 3 must be the US NDC indicator "3".
  // (Positions 1-2 are "00" for unit-level US pharma.)
  if (gtin14[1] !== "0" || gtin14[2] !== NDC_GS1_PREFIX) return null;
  return gtin14.slice(3, 13);
}

/**
 * Return the three possible dashed forms a 10-digit NDC could take.
 * Order: 5-4-1 (most common today), 5-3-2 (legacy), 4-4-2 (oldest).
 * Caller should query the NDC dictionary with each.
 */
export function ndc10DashedCandidates(ndc10: string): string[] {
  if (!/^\d{10}$/.test(ndc10)) return [];
  return [
    `${ndc10.slice(0, 5)}-${ndc10.slice(5, 9)}-${ndc10.slice(9, 10)}`,
    `${ndc10.slice(0, 5)}-${ndc10.slice(5, 8)}-${ndc10.slice(8, 10)}`,
    `${ndc10.slice(0, 4)}-${ndc10.slice(4, 8)}-${ndc10.slice(8, 10)}`,
  ];
}

/**
 * Parse a GS1 Application Identifier-encoded payload (typically from
 * GS1 DataMatrix or GS1-128). FNC1-terminated variable-length AIs.
 * Returns the fields we care about for pharma: gtin, lot, expiry.
 */
export type Gs1Parsed = {
  gtin?: string;
  lot?: string;
  expiry?: string;
  serial?: string;
  raw: Record<string, string>;
};

export function parseGs1Ai(input: string): Gs1Parsed {
  // Strip a leading FNC1 if present (some scanners include it; some don't).
  let s = input.startsWith(FNC1) ? input.slice(1) : input;
  const fields: Record<string, string> = {};

  while (s.length > 0) {
    if (s.length < 2) break;
    const ai = s.slice(0, 2);
    s = s.slice(2);
    if (FIXED_LEN_AIS[ai] != null) {
      const len = FIXED_LEN_AIS[ai];
      if (s.length < len) {
        fields[ai] = s;
        s = "";
        break;
      }
      fields[ai] = s.slice(0, len);
      s = s.slice(len);
    } else if (VARIABLE_LEN_AIS.has(ai)) {
      const sep = s.indexOf(FNC1);
      if (sep === -1) {
        fields[ai] = s;
        s = "";
      } else {
        fields[ai] = s.slice(0, sep);
        s = s.slice(sep + 1);
      }
    } else {
      // Unknown AI: bail out rather than misinterpret remaining bytes.
      break;
    }
  }

  return {
    gtin: fields["01"],
    lot: fields["10"],
    expiry: fields["17"],
    serial: fields["21"],
    raw: fields,
  };
}

export type BarcodeParsed = {
  ndcCandidates: string[];
  ndc10: string | null;
  gtin14: string | null;
  lot: string | null;
  expiry: string | null;
  source: "gs1-datamatrix" | "linear" | "unknown";
};

/**
 * Top-level: take whatever string the scanner produced and try to extract
 * NDC, lot, expiry. Tries GS1 DataMatrix (AI-encoded) first if the input
 * contains FNC1 or starts with "01"; then falls back to UPC-A/EAN-13/GTIN-14
 * normalization.
 */
export function parseBarcode(raw: string): BarcodeParsed {
  const isGs1 = raw.includes(FNC1) || /^01\d{14}/.test(raw);

  if (isGs1) {
    const parsed = parseGs1Ai(raw);
    if (parsed.gtin) {
      const ndc10 = gtin14ToNdc10(parsed.gtin);
      return {
        ndc10,
        gtin14: parsed.gtin,
        ndcCandidates: ndc10 ? ndc10DashedCandidates(ndc10) : [],
        lot: parsed.lot ?? null,
        expiry: parsed.expiry ?? null,
        source: "gs1-datamatrix",
      };
    }
  }

  const gtin14 = normalizeToGtin14(raw);
  if (gtin14) {
    const ndc10 = gtin14ToNdc10(gtin14);
    return {
      ndc10,
      gtin14,
      ndcCandidates: ndc10 ? ndc10DashedCandidates(ndc10) : [],
      lot: null,
      expiry: null,
      source: "linear",
    };
  }

  return {
    ndc10: null,
    gtin14: null,
    ndcCandidates: [],
    lot: null,
    expiry: null,
    source: "unknown",
  };
}

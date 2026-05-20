import { describe, expect, it } from "vitest";
import {
  checkDigit,
  gtin14ToNdc10,
  isValidGtin,
  ndc10DashedCandidates,
  normalizeToGtin14,
  parseBarcode,
  parseGs1Ai,
} from "./gtin";

const FNC1 = String.fromCharCode(29);

describe("checkDigit / isValidGtin", () => {
  // Verified by hand:
  //   GTIN-14 "00312345678906": NDC=1234567890, expected check=6
  //   sum = 0*3 + 9*1 + 8*3 + 7*1 + 6*3 + 5*1 + 4*3 + 3*1 + 2*3 + 1*1 + 3*3 + 0*1 + 0*3
  //       = 0 + 9 + 24 + 7 + 18 + 5 + 12 + 3 + 6 + 1 + 9 + 0 + 0 = 94
  //   check = (10 - (94 % 10)) % 10 = 6 ✓
  it("computes the standard mod-10 check digit", () => {
    expect(checkDigit("0031234567890")).toBe(6);
  });

  it("validates a known-good GTIN-14", () => {
    expect(isValidGtin("00312345678906")).toBe(true);
  });

  it("rejects a GTIN-14 with a bad check digit", () => {
    expect(isValidGtin("00312345678905")).toBe(false);
  });

  it("rejects non-digit input", () => {
    expect(isValidGtin("003123456789AB")).toBe(false);
  });
});

describe("normalizeToGtin14", () => {
  it("upgrades UPC-A (12) to GTIN-14 with two leading zeros", () => {
    // "312345678906" is the UPC-A from the GTIN-14 above (drop the leading "00").
    expect(normalizeToGtin14("312345678906")).toBe("00312345678906");
  });

  it("upgrades EAN-13 (13) to GTIN-14 with one leading zero", () => {
    expect(normalizeToGtin14("0312345678906")).toBe("00312345678906");
  });

  it("passes a valid GTIN-14 through", () => {
    expect(normalizeToGtin14("00312345678906")).toBe("00312345678906");
  });

  it("strips dashes/spaces before parsing", () => {
    expect(normalizeToGtin14("003-123-4567890-6")).toBe("00312345678906");
  });

  it("rejects invalid check digit", () => {
    expect(normalizeToGtin14("00312345678900")).toBeNull();
  });

  it("rejects garbage length", () => {
    expect(normalizeToGtin14("123")).toBeNull();
    expect(normalizeToGtin14("")).toBeNull();
  });
});

describe("gtin14ToNdc10", () => {
  it("extracts the 10-digit NDC from a US-NDC-pattern GTIN-14", () => {
    expect(gtin14ToNdc10("00312345678906")).toBe("1234567890");
  });

  it("returns null when the GTIN-14 is not in the US NDC namespace", () => {
    // Indicator non-zero (packaging-level GTIN, e.g., case)
    // Construct a valid GTIN-14 with indicator '1':
    // data = "1031234567890", check digit:
    //   sum = 0*3 + 9*1 + 8*3 + 7*1 + 6*3 + 5*1 + 4*3 + 3*1 + 2*3 + 1*1 + 3*3 + 0*1 + 1*3
    //       = 0+9+24+7+18+5+12+3+6+1+9+0+3 = 97
    //   check = (10 - 7) % 10 = 3
    expect(gtin14ToNdc10("10312345678903")).toBeNull();
  });

  it("returns null when the indicator-3 byte is missing (non-NDC GS1 prefix)", () => {
    // data = "0021234567890" (prefix "02" instead of "03"), check:
    //   sum = 0*3 + 9*1 + 8*3 + 7*1 + 6*3 + 5*1 + 4*3 + 3*1 + 2*3 + 1*1 + 2*3 + 0*1 + 0*3
    //       = 0+9+24+7+18+5+12+3+6+1+6+0+0 = 91
    //   check = (10 - 1) % 10 = 9
    expect(gtin14ToNdc10("00212345678909")).toBeNull();
  });

  it("returns null for malformed GTIN-14", () => {
    expect(gtin14ToNdc10("not-a-gtin")).toBeNull();
    expect(gtin14ToNdc10("12345")).toBeNull();
  });
});

describe("ndc10DashedCandidates", () => {
  it("returns 5-4-1, 5-3-2, 4-4-2 variants in that order", () => {
    expect(ndc10DashedCandidates("1234567890")).toEqual([
      "12345-6789-0",
      "12345-678-90",
      "1234-5678-90",
    ]);
  });

  it("returns an empty array for non-10-digit input", () => {
    expect(ndc10DashedCandidates("123")).toEqual([]);
    expect(ndc10DashedCandidates("12345abcde")).toEqual([]);
  });
});

describe("parseGs1Ai", () => {
  it("parses a fixed-length GTIN (01) followed by a variable-length lot (10) terminated by FNC1", () => {
    const input = `0100312345678906` + `10ABC123` + FNC1 + `17260131`;
    const parsed = parseGs1Ai(input);
    expect(parsed.gtin).toBe("00312345678906");
    expect(parsed.lot).toBe("ABC123");
    expect(parsed.expiry).toBe("260131");
  });

  it("parses a lot that runs to end of string without FNC1", () => {
    const input = `0100312345678906` + `10XYZ789`;
    const parsed = parseGs1Ai(input);
    expect(parsed.gtin).toBe("00312345678906");
    expect(parsed.lot).toBe("XYZ789");
  });

  it("strips a leading FNC1 if present", () => {
    const input = FNC1 + `0100312345678906`;
    const parsed = parseGs1Ai(input);
    expect(parsed.gtin).toBe("00312345678906");
  });

  it("parses (17) expiry before (10) lot, in either order", () => {
    const input = `0100312345678906` + `17260131` + `10LOTA`;
    const parsed = parseGs1Ai(input);
    expect(parsed.expiry).toBe("260131");
    expect(parsed.lot).toBe("LOTA");
  });
});

describe("parseBarcode (end-to-end)", () => {
  it("parses a US-pharma GS1 DataMatrix payload into NDC candidates + lot + expiry", () => {
    const raw = `0100312345678906` + `10LOT42` + FNC1 + `17260131`;
    const out = parseBarcode(raw);
    expect(out.source).toBe("gs1-datamatrix");
    expect(out.gtin14).toBe("00312345678906");
    expect(out.ndc10).toBe("1234567890");
    expect(out.ndcCandidates).toContain("12345-678-90");
    expect(out.lot).toBe("LOT42");
    expect(out.expiry).toBe("260131");
  });

  it("parses a linear UPC-A into NDC candidates", () => {
    const out = parseBarcode("312345678906");
    expect(out.source).toBe("linear");
    expect(out.ndc10).toBe("1234567890");
    expect(out.ndcCandidates).toHaveLength(3);
  });

  it("returns no NDC for a non-NDC-namespace barcode", () => {
    // Use the "10312345678903" example (indicator 1, packaging level).
    const out = parseBarcode("10312345678903");
    expect(out.ndc10).toBeNull();
    expect(out.ndcCandidates).toEqual([]);
  });

  it("handles complete garbage gracefully", () => {
    const out = parseBarcode("not-a-barcode");
    expect(out.source).toBe("unknown");
    expect(out.ndcCandidates).toEqual([]);
  });
});

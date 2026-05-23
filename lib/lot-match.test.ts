import { describe, expect, it } from "vitest";
import { lotInCodeInfo, parseCodeInfo } from "./lot-match";

describe("parseCodeInfo", () => {
  it("recognizes 'All Lots'", () => {
    expect(parseCodeInfo("All Lots")).toEqual({
      matchAll: true,
      literals: [],
      ranges: [],
    });
    expect(parseCodeInfo("ALL lots subject to recall")).toEqual({
      matchAll: true,
      literals: [],
      ranges: [],
    });
  });

  it("extracts a single literal lot from 'Lot #: AB1234'", () => {
    const p = parseCodeInfo("Lot #: AB1234, BUD: 6/10/2022");
    expect(p.literals).toContain("ab1234");
  });

  it("extracts ranges 'AB1234-AB1240'", () => {
    const p = parseCodeInfo("Affected lots: AB1234-AB1240");
    expect(p.ranges).toContainEqual({ start: "AB1234", end: "AB1240" });
  });

  it("extracts ranges with 'through' wording", () => {
    const p = parseCodeInfo("Lots A12 through A18 affected");
    expect(p.ranges.length).toBeGreaterThan(0);
  });
});

describe("lotInCodeInfo — wildcard", () => {
  it("matches anything when 'All Lots' is in code_info", () => {
    expect(lotInCodeInfo("ANY123", "All Lots")).toBe(true);
    expect(lotInCodeInfo("xyz", "All lots distributed in 2024")).toBe(true);
  });
});

describe("lotInCodeInfo — exact literal", () => {
  it("matches an exact lot mentioned in code_info", () => {
    expect(lotInCodeInfo("AB1234", "Lot #: AB1234, BUD: 6/10/2022")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(lotInCodeInfo("ab1234", "Lot AB1234")).toBe(true);
    expect(lotInCodeInfo("AB1234", "lot ab1234")).toBe(true);
  });

  it("does not match an unrelated lot", () => {
    expect(lotInCodeInfo("AB9999", "Lot #: AB1234, BUD: 6/10/2022")).toBe(false);
  });
});

describe("lotInCodeInfo — ranges", () => {
  it("matches a lot within a numeric-tail range", () => {
    expect(lotInCodeInfo("AB1235", "Affected lots: AB1234-AB1240")).toBe(true);
    expect(lotInCodeInfo("AB1240", "Affected lots: AB1234-AB1240")).toBe(true);
    expect(lotInCodeInfo("AB1234", "Affected lots: AB1234-AB1240")).toBe(true);
  });

  it("does not match a lot outside the range", () => {
    expect(lotInCodeInfo("AB1241", "Affected lots: AB1234-AB1240")).toBe(false);
    expect(lotInCodeInfo("AB1233", "Affected lots: AB1234-AB1240")).toBe(false);
  });

  it("matches purely numeric ranges", () => {
    expect(lotInCodeInfo("12347", "Lots 12345 to 12350")).toBe(true);
    expect(lotInCodeInfo("12351", "Lots 12345 to 12350")).toBe(false);
  });

  it("rejects lots from a different prefix family", () => {
    // "XY1235" does not belong to the AB-prefix range "AB1234-AB1240"
    expect(lotInCodeInfo("XY1235", "Affected lots: AB1234-AB1240")).toBe(false);
  });
});

describe("lotInCodeInfo — substring fallback", () => {
  it("catches lots embedded in unstructured text", () => {
    // Date / BUD context that doesn't follow the "Lot N" pattern
    expect(lotInCodeInfo("03312022", "Manufactured 03312022 expires 2025")).toBe(true);
  });

  it("requires at least 3 characters", () => {
    expect(lotInCodeInfo("AB", "Lot AB and Lot CD")).toBe(false);
  });
});

describe("lotInCodeInfo — empty / null inputs", () => {
  it("returns false when code_info is null", () => {
    expect(lotInCodeInfo("AB1234", null)).toBe(false);
  });
  it("returns false when user lot is empty", () => {
    expect(lotInCodeInfo("", "Lot AB1234")).toBe(false);
  });
});

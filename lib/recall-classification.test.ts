import { describe, expect, it } from "vitest";
import {
  matchesRecallClass,
  parseRecallClassTier,
  recallClassChipClass,
  recallClassLabel,
  sortRecallClassTiers,
} from "./recall-classification";

describe("matchesRecallClass", () => {
  it("matches Class I only", () => {
    expect(matchesRecallClass("Class I", "I")).toBe(true);
    expect(matchesRecallClass("Class II", "I")).toBe(false);
    expect(matchesRecallClass("Class III", "I")).toBe(false);
  });

  it("matches Class II only", () => {
    expect(matchesRecallClass("Class II", "II")).toBe(true);
    expect(matchesRecallClass("Class I", "II")).toBe(false);
    expect(matchesRecallClass("Class III", "II")).toBe(false);
  });

  it("matches Class III only", () => {
    expect(matchesRecallClass("Class III", "III")).toBe(true);
    expect(matchesRecallClass("Class II", "III")).toBe(false);
  });
});

describe("parseRecallClassTier", () => {
  it("does not treat Class II as Class I", () => {
    expect(parseRecallClassTier("Class II")).toBe("II");
    expect(parseRecallClassTier("Class I")).toBe("I");
    expect(parseRecallClassTier("Class III")).toBe("III");
  });
});

describe("recallClassLabel", () => {
  it("returns tier labels", () => {
    expect(recallClassLabel("Class II")).toBe("Class II");
    expect(recallClassLabel(null)).toBe("Unclassified");
  });
});

describe("recallClassChipClass", () => {
  it("maps tiers to chip classes", () => {
    expect(recallClassChipClass("Class I")).toContain("chip-i");
    expect(recallClassChipClass("Class II")).toContain("chip-ii");
    expect(recallClassChipClass("Class III")).toContain("chip-iii");
  });
});

describe("sortRecallClassTiers", () => {
  it("orders by severity", () => {
    expect(sortRecallClassTiers(["III", "I", "II"])).toEqual(["I", "II", "III"]);
  });
});

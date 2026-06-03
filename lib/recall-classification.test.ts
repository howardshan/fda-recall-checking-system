import { describe, expect, it } from "vitest";
import { matchesRecallClass } from "./recall-classification";

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

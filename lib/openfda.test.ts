import { describe, expect, it } from "vitest";
import { dateRangeClause } from "./openfda";

describe("dateRangeClause", () => {
  it("uses spaced TO so URLSearchParams does not emit %2BTO%2B", () => {
    const clause = dateRangeClause("recall_initiation_date", "2026-05-03", "2026-06-02");
    expect(clause).toBe("recall_initiation_date:[20260503 TO 20260602]");
    expect(clause).not.toContain("+TO+");
  });

  it("encodes via URLSearchParams with plus-as-space for TO", () => {
    const clause = dateRangeClause("recall_initiation_date", "2026-05-03", "2026-06-02");
    const url = new URL("https://api.fda.gov/drug/enforcement.json");
    url.searchParams.set("search", clause);
    expect(url.searchParams.get("search")).toBe(clause);
    expect(url.search).not.toMatch(/%2BTO%2B/i);
  });
});

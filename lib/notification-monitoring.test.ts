import { describe, expect, it } from "vitest";
import { recallIdsFromMatches } from "./notification-monitoring";

describe("recallIdsFromMatches", () => {
  it("extracts recall ids", () => {
    expect(recallIdsFromMatches([{ id: 10 }, { id: 20 }])).toEqual([10, 20]);
  });

  it("returns empty for no matches", () => {
    expect(recallIdsFromMatches([])).toEqual([]);
  });
});

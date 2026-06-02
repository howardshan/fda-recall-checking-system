import { describe, expect, it } from "vitest";
import { selectMonitoredMedIds } from "./plan-monitoring";

describe("selectMonitoredMedIds", () => {
  it("keeps oldest meds up to limit", () => {
    const meds = [
      { id: 3, added_at: "2024-03-01T00:00:00Z" },
      { id: 1, added_at: "2024-01-01T00:00:00Z" },
      { id: 2, added_at: "2024-02-01T00:00:00Z" },
    ];
    const kept = selectMonitoredMedIds(meds, 2);
    expect(kept.has(1)).toBe(true);
    expect(kept.has(2)).toBe(true);
    expect(kept.has(3)).toBe(false);
  });

  it("returns all when under limit", () => {
    const meds = [
      { id: 1, added_at: "2024-01-01T00:00:00Z" },
      { id: 2, added_at: "2024-02-01T00:00:00Z" },
    ];
    const kept = selectMonitoredMedIds(meds, 5);
    expect(kept.size).toBe(2);
  });

  it("handles null added_at as oldest", () => {
    const meds = [
      { id: 1, added_at: null },
      { id: 2, added_at: "2024-06-01T00:00:00Z" },
    ];
    const kept = selectMonitoredMedIds(meds, 1);
    expect(kept.has(1)).toBe(true);
    expect(kept.has(2)).toBe(false);
  });
});

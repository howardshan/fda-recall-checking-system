import { describe, expect, it } from "vitest";
import {
  canReceiveInstantEmail,
  hasPaidPlan,
  medQuota,
  QUOTAS,
  upgradeTargetForMeds,
} from "./plan";

describe("plan capabilities", () => {
  it("medQuota matches QUOTAS", () => {
    expect(medQuota("free")).toBe(QUOTAS.free.meds);
    expect(medQuota("personal")).toBe(20);
    expect(medQuota("family")).toBe(100);
  });

  it("hasPaidPlan", () => {
    expect(hasPaidPlan("free")).toBe(false);
    expect(hasPaidPlan("personal")).toBe(true);
    expect(hasPaidPlan("family")).toBe(true);
  });

  it("canReceiveInstantEmail only for paid plans", () => {
    expect(canReceiveInstantEmail("free")).toBe(false);
    expect(canReceiveInstantEmail("personal")).toBe(true);
    expect(canReceiveInstantEmail("family")).toBe(true);
  });

  it("upgradeTargetForMeds walks the ladder", () => {
    expect(upgradeTargetForMeds("free")).toBe("personal");
    expect(upgradeTargetForMeds("personal")).toBe("family");
    expect(upgradeTargetForMeds("family")).toBeNull();
  });
});

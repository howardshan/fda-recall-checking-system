import { describe, expect, it } from "vitest";
import {
  canManageFamily,
  canReceiveInstantEmail,
  hasPaidPlan,
  medQuota,
  QUOTAS,
} from "./plan";

describe("plan capabilities", () => {
  it("medQuota matches QUOTAS", () => {
    expect(medQuota("free")).toBe(QUOTAS.free.meds);
    expect(medQuota("personal")).toBe(20);
    expect(medQuota("family")).toBe(50);
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

  it("canManageFamily only for family", () => {
    expect(canManageFamily("free")).toBe(false);
    expect(canManageFamily("personal")).toBe(false);
    expect(canManageFamily("family")).toBe(true);
  });
});

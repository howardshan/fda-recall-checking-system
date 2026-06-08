import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectivePlan } from "./stripe-billing";

export type Plan = "free" | "personal" | "family";

export type Quota = {
  meds: number;
};

export const QUOTAS: Record<Plan, Quota> = {
  free: { meds: 2 },
  personal: { meds: 20 },
  family: { meds: 100 },
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  personal: "Personal Pro",
  family: "Family Protection",
};

export function hasPaidPlan(plan: Plan): boolean {
  return plan === "personal" || plan === "family";
}

export function canReceiveInstantEmail(plan: Plan): boolean {
  return hasPaidPlan(plan);
}

export function medQuota(plan: Plan): number {
  return QUOTAS[plan].meds;
}

/** Cheapest plan that satisfies the requested resource, given the user's current plan. */
export function upgradeTargetForMeds(current: Plan): Plan | null {
  if (current === "free") return "personal";
  if (current === "personal") return "family";
  return null;
}

/** Quota check error. Shape mirrors the JSON the API returns. */
export class QuotaExceededError extends Error {
  constructor(
    public readonly resource: "meds",
    public readonly currentPlan: Plan,
    public readonly limit: number,
    public readonly upgradeTo: Plan | null,
  ) {
    super("QUOTA_EXCEEDED");
    this.name = "QuotaExceededError";
  }

  toJson() {
    return {
      error: "QUOTA_EXCEEDED",
      resource: this.resource,
      currentPlan: this.currentPlan,
      limit: this.limit,
      upgradeTo: this.upgradeTo,
    };
  }
}

export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<Plan> {
  return getEffectivePlan(supabase, userId);
}

/** Throws QuotaExceededError if adding a med would exceed the user's plan. */
export async function enforceMedQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const plan = await getUserPlan(supabase, userId);
  const limit = QUOTAS[plan].meds;
  const { count } = await supabase
    .from("medication_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if ((count ?? 0) >= limit) {
    throw new QuotaExceededError("meds", plan, limit, upgradeTargetForMeds(plan));
  }
}

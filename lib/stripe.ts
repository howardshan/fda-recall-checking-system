import Stripe from "stripe";
import type { Plan } from "./plan";

export type BillingCycle = "monthly" | "annual";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}

export function stripePriceId(plan: Plan, cycle: BillingCycle): string {
  if (plan === "free") throw new Error("Free plan has no Stripe price");
  const envKey =
    plan === "personal"
      ? cycle === "monthly"
        ? "STRIPE_PRICE_PERSONAL_MONTHLY"
        : "STRIPE_PRICE_PERSONAL_YEARLY"
      : cycle === "monthly"
        ? "STRIPE_PRICE_FAMILY_MONTHLY"
        : "STRIPE_PRICE_FAMILY_YEARLY";
  const id = process.env[envKey];
  if (!id) throw new Error(`Missing ${envKey}`);
  return id;
}

export function planFromStripePrice(priceId: string): {
  plan: Plan;
  cycle: BillingCycle;
} | null {
  const map: Array<[string | undefined, Plan, BillingCycle]> = [
    [process.env.STRIPE_PRICE_PERSONAL_MONTHLY, "personal", "monthly"],
    [process.env.STRIPE_PRICE_PERSONAL_YEARLY, "personal", "annual"],
    [process.env.STRIPE_PRICE_FAMILY_MONTHLY, "family", "monthly"],
    [process.env.STRIPE_PRICE_FAMILY_YEARLY, "family", "annual"],
  ];
  for (const [id, plan, cycle] of map) {
    if (id && id === priceId) return { plan, cycle };
  }
  return null;
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
}

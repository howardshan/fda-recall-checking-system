import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type Plan } from "./plan";
import { planFromStripePrice, type BillingCycle } from "./stripe";

export type { BillingCycle };

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  plan: Plan;
  billing_cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

/** Active billing cycle for paid subscribers, if known. */
export async function getCurrentBillingCycle(
  supabase: SupabaseClient,
  userId: string,
): Promise<BillingCycle | null> {
  const plan = await getEffectivePlan(supabase, userId);
  if (plan !== "personal" && plan !== "family") return null;

  const { data: sub } = await supabase
    .from("stripe_subscriptions")
    .select("billing_cycle")
    .eq("user_id", userId)
    .maybeSingle();

  const raw = sub?.billing_cycle as string | undefined;
  if (raw === "monthly" || raw === "annual") return raw;
  return null;
}

/** Effective paid plan from stripe_subscriptions + profiles fallback. */
export async function getEffectivePlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<Plan> {
  const { data: sub } = await supabase
    .from("stripe_subscriptions")
    .select("status, plan, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (sub) {
    const status = sub.status as string;
    const plan = sub.plan as Plan;
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end as string).getTime()
      : 0;
    const now = Date.now();

    if (status === "past_due" || status === "unpaid" || status === "incomplete_expired") {
      return "free";
    }

    if (status === "active" || status === "trialing") {
      if (plan === "personal" || plan === "family") return plan;
    }

    if (
      sub.cancel_at_period_end &&
      periodEnd > now &&
      (plan === "personal" || plan === "family")
    ) {
      return plan;
    }

    if (status === "canceled" && periodEnd > now && (plan === "personal" || plan === "family")) {
      return plan;
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  const raw = (profile?.plan as string | undefined) ?? "free";
  if (raw === "personal" || raw === "family") return raw;
  return "free";
}

export async function syncSubscriptionFromStripe(
  supabase: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const mapped = planFromStripePrice(priceId);
  const plan: Plan = mapped?.plan ?? "free";
  const cycle = mapped?.cycle ?? null;

  const status = subscription.status;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  let effectivePlan: Plan = "free";
  if (status === "active" || status === "trialing") {
    effectivePlan = plan;
  } else if (
    (status === "canceled" || subscription.cancel_at_period_end) &&
    subscription.current_period_end * 1000 > Date.now()
  ) {
    effectivePlan = plan;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await supabase.from("stripe_subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status,
    plan,
    billing_cycle: cycle,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });

  await supabase
    .from("profiles")
    .update({
      plan: effectivePlan,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export async function revokePaidAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from("stripe_subscriptions")
    .update({
      status: "past_due",
      plan: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  await supabase
    .from("profiles")
    .update({ plan: "free", updated_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function ensureStripeCustomer(
  supabase: SupabaseClient,
  stripe: Stripe,
  userId: string,
  email: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
    name: profile?.full_name ?? undefined,
  });

  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

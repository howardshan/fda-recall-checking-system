import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { medQuota, type Plan } from "./plan";
import {
  syncMonitoringQuota,
  type SyncMonitoringQuotaResult,
} from "./plan-monitoring";
import { planFromStripePrice, type BillingCycle } from "./stripe";

export type { BillingCycle };

const BILLABLE_STATUSES = new Set(["active", "trialing"]);

/** Stripe Basil+ stores billing period on subscription items; older APIs use the subscription root. */
type PeriodFields = { current_period_end?: number | null };

export function subscriptionPeriodEndUnix(
  subscription: Stripe.Subscription,
): number | null {
  const top = (subscription as Stripe.Subscription & PeriodFields).current_period_end;
  if (typeof top === "number" && top > 0) return top;

  const item = subscription.items.data[0] as PeriodFields | undefined;
  const fromItem = item?.current_period_end;
  if (typeof fromItem === "number" && fromItem > 0) return fromItem;

  return null;
}

export function subscriptionPeriodEndIso(
  subscription: Stripe.Subscription,
): string | null {
  const unix = subscriptionPeriodEndUnix(subscription);
  return unix ? new Date(unix * 1000).toISOString() : null;
}

function isWithinPaidPeriod(subscription: Stripe.Subscription): boolean {
  const end = subscriptionPeriodEndUnix(subscription);
  return end !== null && end * 1000 > Date.now();
}

export function isStripeSubscriptionBillable(status: string): boolean {
  return BILLABLE_STATUSES.has(status);
}

/**
 * After Checkout the subscription can briefly stay `incomplete` while payment
 * settles. Retry a few times before writing stale state to the database.
 */
export async function retrieveSubscriptionWhenReady(
  stripe: Stripe,
  subscriptionId: string,
  maxAttempts = 4,
): Promise<Stripe.Subscription> {
  let sub = await stripe.subscriptions.retrieve(subscriptionId);

  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    if (isStripeSubscriptionBillable(sub.status)) return sub;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    sub = await stripe.subscriptions.retrieve(subscriptionId);
  }

  return sub;
}

/** Resolve app user id from subscription metadata or existing DB rows. */
export async function resolveUserIdForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = subscription.metadata?.user_id;
  if (fromMeta) return fromMeta;

  const { data: bySub } = await supabase
    .from("stripe_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (bySub?.user_id) return bySub.user_id as string;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const { data: byCustomer } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (byCustomer?.id as string | undefined) ?? null;
}

/**
 * Returns an active Stripe subscription id for the user. Re-fetches from Stripe
 * when the local row is stale (e.g. status stuck at `incomplete` after payment).
 */
export async function resolveActiveSubscriptionId(
  stripe: Stripe,
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: subRow } = await supabase
    .from("stripe_subscriptions")
    .select("stripe_subscription_id, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const subId = subRow?.stripe_subscription_id as string | undefined;
  if (!subId) return null;

  const live = await stripe.subscriptions.retrieve(subId);
  if (isStripeSubscriptionBillable(live.status)) {
    const needsSync =
      subRow?.status !== live.status || !subRow?.current_period_end;
    if (needsSync) {
      await syncSubscriptionFromStripe(supabase, userId, live);
    }
    return subId;
  }

  return null;
}

export async function syncSubscriptionFromEvent(
  stripe: Stripe,
  supabase: SupabaseClient,
  subscriptionId: string,
  userIdHint?: string | null,
): Promise<SyncMonitoringQuotaResult | null> {
  const sub = await retrieveSubscriptionWhenReady(stripe, subscriptionId);
  const userId =
    userIdHint ?? (await resolveUserIdForSubscription(supabase, sub));
  if (!userId) {
    console.warn(
      "[stripe-billing] sync skipped — no user for subscription",
      subscriptionId,
    );
    return null;
  }
  return syncSubscriptionFromStripe(supabase, userId, sub);
}

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
    .select(
      "status, plan, current_period_end, cancel_at_period_end, stripe_subscription_id",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (sub) {
    const status = sub.status as string;
    const plan = sub.plan as Plan;
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end as string).getTime()
      : 0;
    const now = Date.now();

    if (status === "incomplete_expired") {
      return "free";
    }

    if (status === "past_due" || status === "unpaid") {
      if (
        periodEnd > now &&
        (plan === "personal" || plan === "family")
      ) {
        return plan;
      }
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

    // Row exists but is not billable (e.g. incomplete) — do not trust profiles.plan.
    return "free";
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
): Promise<SyncMonitoringQuotaResult | null> {
  const previousPlan = await getEffectivePlan(supabase, userId);

  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const mapped = planFromStripePrice(priceId);
  const plan: Plan = mapped?.plan ?? "free";
  const cycle = mapped?.cycle ?? null;

  const status = subscription.status;
  const periodEnd = subscriptionPeriodEndIso(subscription);

  let effectivePlan: Plan = "free";
  if (status === "active" || status === "trialing") {
    effectivePlan = plan;
  } else if (
    (status === "past_due" || status === "unpaid") &&
    isWithinPaidPeriod(subscription) &&
    (plan === "personal" || plan === "family")
  ) {
    effectivePlan = plan;
  } else if (
    (status === "canceled" || subscription.cancel_at_period_end) &&
    isWithinPaidPeriod(subscription)
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

  const prevQuota = medQuota(previousPlan);
  const nextQuota = medQuota(effectivePlan);
  if (nextQuota !== prevQuota) {
    return syncMonitoringQuota(supabase, userId, effectivePlan);
  }
  return null;
}

export function isSubscriptionUpdateInvoice(invoice: Stripe.Invoice): boolean {
  return invoice.billing_reason === "subscription_update";
}

export type PlanChangeResult =
  | { kind: "payment_required"; url: string }
  | { kind: "applied"; subscription: Stripe.Subscription };

/** Stripe forbids cancel_at_period_end on pending_if_incomplete updates — clear separately. */
async function clearScheduledCancellationIfNeeded(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  if (!subscription.cancel_at_period_end) return subscription;
  return stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: false,
  });
}

/** Update subscription price with Stripe proration; require hosted payment when due. */
export async function applySubscriptionPlanChange(
  stripe: Stripe,
  subscriptionId: string,
  userId: string,
  targetPriceId: string,
  plan: Plan,
  cycle: BillingCycle,
): Promise<PlanChangeResult> {
  const existing = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = existing.items.data[0]?.id;
  const currentPriceId = existing.items.data[0]?.price?.id;
  if (!itemId || !currentPriceId) {
    throw new Error("Subscription item missing");
  }

  if (currentPriceId === targetPriceId) {
    return { kind: "applied", subscription: existing };
  }

  await clearScheduledCancellationIfNeeded(stripe, existing);

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: targetPriceId }],
    proration_behavior: "always_invoice",
    payment_behavior: "pending_if_incomplete",
    expand: ["latest_invoice"],
    metadata: {
      user_id: userId,
      plan,
      cycle,
      previous_price_id: currentPriceId,
      pending_plan_change: `${plan}:${cycle}`,
    },
  });

  const invoiceRef = updated.latest_invoice;
  const invoiceId =
    typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;

  if (!invoiceId) {
    return { kind: "applied", subscription: updated };
  }

  const invoice =
    typeof invoiceRef === "object" && invoiceRef
      ? invoiceRef
      : await stripe.invoices.retrieve(invoiceId);

  if (invoice.status === "paid" || invoice.amount_due <= 0) {
    return { kind: "applied", subscription: updated };
  }

  const payUrl = invoice.hosted_invoice_url;
  if (!payUrl) {
    throw new Error("Could not create payment page for plan change");
  }

  return { kind: "payment_required", url: payUrl };
}

export async function clearPendingPlanChangeMetadata(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  const meta = subscription.metadata ?? {};
  const {
    previous_price_id: _previousPriceId,
    pending_plan_change: _pendingPlanChange,
    rollback_reason: _rollbackReason,
    ...rest
  } = meta;

  return stripe.subscriptions.update(subscription.id, {
    metadata: {
      ...rest,
      previous_price_id: "",
      pending_plan_change: "",
      rollback_reason: "",
    },
  });
}

/** Revert a failed plan-change invoice back to the previous Stripe price. */
export async function rollbackSubscriptionPlanChange(
  stripe: Stripe,
  supabase: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription,
): Promise<SyncMonitoringQuotaResult | null> {
  const previousPriceId = subscription.metadata?.previous_price_id;
  const itemId = subscription.items.data[0]?.id;
  const currentPriceId = subscription.items.data[0]?.price?.id;

  if (!previousPriceId || !itemId) {
    return syncSubscriptionFromStripe(supabase, userId, subscription);
  }

  if (currentPriceId === previousPriceId) {
    const cleared = await clearPendingPlanChangeMetadata(stripe, subscription);
    return syncSubscriptionFromStripe(supabase, userId, cleared);
  }

  const mapped = planFromStripePrice(previousPriceId);
  const rolled = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: itemId, price: previousPriceId }],
    proration_behavior: "none",
    payment_behavior: "pending_if_incomplete",
    metadata: {
      user_id: userId,
      plan: mapped?.plan ?? subscription.metadata?.plan ?? "personal",
      cycle: mapped?.cycle ?? subscription.metadata?.cycle ?? "monthly",
      previous_price_id: "",
      pending_plan_change: "",
      rollback_reason: "payment_failed",
    },
  });

  return syncSubscriptionFromStripe(supabase, userId, rolled);
}

export async function handleInvoicePaymentFailed(
  stripe: Stripe,
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const userId = await resolveUserIdForSubscription(supabase, sub);
  if (!userId) return;

  const hasPendingChange = Boolean(sub.metadata?.previous_price_id);
  if (isSubscriptionUpdateInvoice(invoice) || hasPendingChange) {
    await rollbackSubscriptionPlanChange(stripe, supabase, userId, sub);
    return;
  }

  await syncSubscriptionFromStripe(supabase, userId, sub);
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

  await syncMonitoringQuota(supabase, userId, "free");
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

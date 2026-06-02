import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "./stripe";
import { sendEmailQuietly } from "./mailer";

export type RefundAttemptResult =
  | { status: "success"; amountCents: number; refundIds: string[] }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function refundsEnabled(): boolean {
  const flag = process.env.STRIPE_REFUND_ON_CANCEL?.trim().toLowerCase();
  return flag !== "false" && flag !== "0";
}

function minRefundCents(): number {
  const raw = Number.parseInt(process.env.REFUND_MIN_CENTS ?? "100", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 100;
}

/** Stripe: negative customer.balance = account credit (applied to future invoices). */
export function customerCreditCents(balance: number | null | undefined): number {
  if (typeof balance !== "number" || balance >= 0) return 0;
  return Math.abs(balance);
}

async function logRefundAttempt(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    stripe_subscription_id: string;
    stripe_event_id: string;
    stripe_customer_id: string;
    amount_cents: number;
    stripe_refund_id: string | null;
    status: "success" | "failed" | "skipped";
    error_message?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("stripe_refund_events").insert(row);
  if (error && !error.message.includes("duplicate")) {
    console.error("[stripe-refund] log insert failed:", error.message);
  }
}

async function notifyOpsRefundFailure(
  userId: string,
  subscriptionId: string,
  message: string,
): Promise<void> {
  const ops = process.env.OPS_ALERT_EMAIL?.trim();
  if (!ops) return;
  await sendEmailQuietly({
    to: ops,
    subject: `[SafeTrack] Subscription refund failed (${subscriptionId})`,
    html: `<p>Automatic refund on <code>customer.subscription.deleted</code> failed.</p>
<ul><li>User: ${userId}</li><li>Subscription: ${subscriptionId}</li><li>Error: ${message}</li></ul>`,
    text: `Refund failed for user ${userId}, sub ${subscriptionId}: ${message}`,
  });
}

/**
 * Refund remaining Stripe customer credit to the original payment method(s)
 * when a subscription ends. Idempotent per webhook event id.
 */
export async function refundCustomerCreditOnSubscriptionEnd(
  supabase: SupabaseClient,
  params: {
    userId: string;
    subscriptionId: string;
    stripeEventId: string;
    customerId: string;
    stripe?: Stripe;
  },
): Promise<RefundAttemptResult> {
  if (!refundsEnabled()) {
    return { status: "skipped", reason: "refunds_disabled" };
  }

  const stripe = params.stripe ?? getStripe();

  const { data: existing } = await supabase
    .from("stripe_refund_events")
    .select("status, amount_cents, stripe_refund_id")
    .eq("stripe_event_id", params.stripeEventId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "success") {
      return {
        status: "success",
        amountCents: (existing.amount_cents as number) ?? 0,
        refundIds: existing.stripe_refund_id ? [existing.stripe_refund_id as string] : [],
      };
    }
    return { status: "skipped", reason: "already_processed" };
  }

  let customer: Stripe.Customer;
  try {
    const retrieved = await stripe.customers.retrieve(params.customerId);
    if (retrieved.deleted) {
      await logRefundAttempt(supabase, {
        user_id: params.userId,
        stripe_subscription_id: params.subscriptionId,
        stripe_event_id: params.stripeEventId,
        stripe_customer_id: params.customerId,
        amount_cents: 0,
        stripe_refund_id: null,
        status: "skipped",
        error_message: "customer_deleted",
      });
      return { status: "skipped", reason: "customer_deleted" };
    }
    customer = retrieved;
  } catch (e) {
    const message = e instanceof Error ? e.message : "customer_retrieve_failed";
    await logRefundAttempt(supabase, {
      user_id: params.userId,
      stripe_subscription_id: params.subscriptionId,
      stripe_event_id: params.stripeEventId,
      stripe_customer_id: params.customerId,
      amount_cents: 0,
      stripe_refund_id: null,
      status: "failed",
      error_message: message,
    });
    await notifyOpsRefundFailure(params.userId, params.subscriptionId, message);
    return { status: "failed", error: message };
  }

  const creditCents = customerCreditCents(customer.balance);
  const currency = (customer.currency ?? "usd").toLowerCase();
  const minCents = minRefundCents();

  if (creditCents < minCents) {
    await logRefundAttempt(supabase, {
      user_id: params.userId,
      stripe_subscription_id: params.subscriptionId,
      stripe_event_id: params.stripeEventId,
      stripe_customer_id: params.customerId,
      amount_cents: 0,
      stripe_refund_id: null,
      status: "skipped",
      error_message: creditCents === 0 ? "no_credit_balance" : "below_minimum",
    });
    return {
      status: "skipped",
      reason: creditCents === 0 ? "no_credit_balance" : "below_minimum",
    };
  }

  let remaining = creditCents;
  const refundIds: string[] = [];
  let totalRefunded = 0;

  try {
    const charges = await stripe.charges.list({
      customer: params.customerId,
      limit: 25,
    });

    for (const charge of charges.data) {
      if (!charge.paid || charge.status !== "succeeded") continue;
      const alreadyRefunded = charge.amount_refunded ?? 0;
      const refundable = charge.amount - alreadyRefunded;
      if (refundable <= 0) continue;

      const amount = Math.min(remaining, refundable);
      const refund = await stripe.refunds.create({
        charge: charge.id,
        amount,
        reason: "requested_by_customer",
        metadata: {
          user_id: params.userId,
          subscription_id: params.subscriptionId,
          stripe_event_id: params.stripeEventId,
        },
      });
      refundIds.push(refund.id);
      totalRefunded += amount;
      remaining -= amount;
      if (remaining <= 0) break;
    }

    if (totalRefunded > 0) {
      await stripe.customers.createBalanceTransaction(params.customerId, {
        amount: totalRefunded,
        currency,
        description: "Credit cleared after subscription ended refund",
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "refund_failed";
    await logRefundAttempt(supabase, {
      user_id: params.userId,
      stripe_subscription_id: params.subscriptionId,
      stripe_event_id: params.stripeEventId,
      stripe_customer_id: params.customerId,
      amount_cents: totalRefunded,
      stripe_refund_id: refundIds[0] ?? null,
      status: "failed",
      error_message: message,
    });
    await notifyOpsRefundFailure(params.userId, params.subscriptionId, message);
    return { status: "failed", error: message };
  }

  if (totalRefunded === 0) {
    const message = "no_refundable_charge";
    await logRefundAttempt(supabase, {
      user_id: params.userId,
      stripe_subscription_id: params.subscriptionId,
      stripe_event_id: params.stripeEventId,
      stripe_customer_id: params.customerId,
      amount_cents: 0,
      stripe_refund_id: null,
      status: "failed",
      error_message: message,
    });
    await notifyOpsRefundFailure(params.userId, params.subscriptionId, message);
    return { status: "failed", error: message };
  }

  await logRefundAttempt(supabase, {
    user_id: params.userId,
    stripe_subscription_id: params.subscriptionId,
    stripe_event_id: params.stripeEventId,
    stripe_customer_id: params.customerId,
    amount_cents: totalRefunded,
    stripe_refund_id: refundIds[0] ?? null,
    status: "success",
  });

  if (remaining > 0) {
    console.warn(
      `[stripe-refund] partial refund: credited ${creditCents}, refunded ${totalRefunded}, remaining ${remaining}`,
    );
  }

  return { status: "success", amountCents: totalRefunded, refundIds };
}

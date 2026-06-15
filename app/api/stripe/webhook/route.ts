import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import {
  clearPendingPlanChangeMetadata,
  handleInvoicePaymentFailed,
  resolveUserIdForSubscription,
  syncSubscriptionFromEvent,
  syncSubscriptionFromStripe,
} from "@/lib/stripe-billing";
import { dispatchAfterMatch } from "@/lib/dispatch-after-match";
import { handleSubscriptionDeleted } from "@/lib/subscription-ended";
import type { SyncMonitoringQuotaResult } from "@/lib/plan-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dispatchIfNewMatches(
  admin: ReturnType<typeof getServerSupabase>,
  quotaResult: SyncMonitoringQuotaResult | null,
): Promise<void> {
  if (!quotaResult || quotaResult.newNotifications <= 0) return;
  await dispatchAfterMatch(admin).catch((e) => {
    console.error("[stripe/webhook] dispatch after quota restore failed:", e);
  });
}

async function syncSubscriptionObject(
  stripe: Stripe,
  admin: ReturnType<typeof getServerSupabase>,
  sub: Stripe.Subscription,
  userIdHint?: string | null,
): Promise<void> {
  const userId =
    userIdHint ?? (await resolveUserIdForSubscription(admin, sub));
  if (!userId) {
    console.warn("[stripe/webhook] no user for subscription", sub.id);
    return;
  }
  const quotaResult = await syncSubscriptionFromStripe(admin, userId, sub);
  await dispatchIfNewMatches(admin, quotaResult);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid signature";
    console.error("[stripe/webhook] verify failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = getServerSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const quotaResult = await syncSubscriptionFromEvent(
            stripe,
            admin,
            subId,
            userId,
          );
          await dispatchIfNewMatches(admin, quotaResult);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionObject(stripe, admin, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(admin, sub, event.id, stripe);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = await resolveUserIdForSubscription(admin, sub);
          if (userId) {
            const cleared = await clearPendingPlanChangeMetadata(stripe, sub);
            const quotaResult = await syncSubscriptionFromStripe(
              admin,
              userId,
              cleared,
            );
            await dispatchIfNewMatches(admin, quotaResult);
          } else {
            const quotaResult = await syncSubscriptionFromEvent(
              stripe,
              admin,
              subId,
            );
            await dispatchIfNewMatches(admin, quotaResult);
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(stripe, admin, invoice);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook] handler error:", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

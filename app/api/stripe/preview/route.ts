import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { getStripe, stripePriceId, type BillingCycle } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  resolveActiveSubscriptionId,
} from "@/lib/stripe-billing";
import type { Plan } from "@/lib/plan";

type Body = {
  plan?: Plan;
  cycle?: BillingCycle;
};

function centsFromStripe(amount?: number | null): number {
  return typeof amount === "number" ? amount : 0;
}

export async function POST(req: Request) {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan;
  const cycle = body.cycle ?? "monthly";
  if (!plan || plan === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (cycle !== "monthly" && cycle !== "annual") {
    return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const admin = getServerSupabase();
    const userId = userData.user.id;
    const targetPriceId = stripePriceId(plan, cycle);

    const customerId = await ensureStripeCustomer(
      admin,
      stripe,
      userId,
      userData.user.email,
    );
    const existingSubId = await resolveActiveSubscriptionId(stripe, admin, userId);

    if (!existingSubId) {
      const price = await stripe.prices.retrieve(targetPriceId);
      return NextResponse.json({
        hasActiveSubscription: false,
        target: {
          plan,
          cycle,
          priceId: targetPriceId,
          amountCents: centsFromStripe(price.unit_amount),
          currency: price.currency ?? "usd",
          interval: price.recurring?.interval ?? null,
        },
        estimate: {
          amountDueNowCents: centsFromStripe(price.unit_amount),
          totalCents: centsFromStripe(price.unit_amount),
          prorationCents: 0,
          lineItems: [],
        },
      });
    }

    const existing = await stripe.subscriptions.retrieve(existingSubId);
    const itemId = existing.items.data[0]?.id;
    const currentPrice = existing.items.data[0]?.price;
    if (!itemId || !currentPrice) {
      return NextResponse.json({ error: "Subscription item missing" }, { status: 500 });
    }

    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: existingSubId,
      subscription_details: {
        items: [{ id: itemId, price: targetPriceId }],
        proration_behavior: "always_invoice",
      },
    });

    return NextResponse.json({
      hasActiveSubscription: true,
      current: {
        plan: existing.metadata?.plan ?? null,
        cycle: existing.metadata?.cycle ?? null,
        priceId: currentPrice.id,
        amountCents: centsFromStripe(currentPrice.unit_amount),
        currency: currentPrice.currency ?? "usd",
        interval: currentPrice.recurring?.interval ?? null,
      },
      target: {
        plan,
        cycle,
        priceId: targetPriceId,
      },
      estimate: {
        amountDueNowCents: centsFromStripe(upcoming.amount_due),
        totalCents: centsFromStripe(upcoming.total),
        subtotalCents: centsFromStripe(upcoming.subtotal),
        prorationCents: upcoming.lines.data
          .filter((line) => Boolean(line.proration))
          .reduce((sum, line) => sum + centsFromStripe(line.amount), 0),
        lineItems: upcoming.lines.data.slice(0, 8).map((line) => ({
          description: line.description ?? "Stripe line item",
          amountCents: centsFromStripe(line.amount),
          proration: Boolean(line.proration),
        })),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    console.error("[stripe/preview]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { appBaseUrl, getStripe, stripePriceId, type BillingCycle } from "@/lib/stripe";
import { dispatchAfterMatch } from "@/lib/dispatch-after-match";
import {
  ensureStripeCustomer,
  resolveActiveSubscriptionId,
  syncSubscriptionFromStripe,
} from "@/lib/stripe-billing";
import type { Plan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  plan?: Plan;
  cycle?: BillingCycle;
};

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
    const customerId = await ensureStripeCustomer(
      admin,
      stripe,
      userId,
      userData.user.email,
    );

    const priceId = stripePriceId(plan, cycle);
    const base = appBaseUrl();

    const existingSubId = await resolveActiveSubscriptionId(stripe, admin, userId);

    if (existingSubId) {
      const existing = await stripe.subscriptions.retrieve(existingSubId);
      const itemId = existing.items.data[0]?.id;
      if (!itemId) {
        return NextResponse.json({ error: "Subscription item missing" }, { status: 500 });
      }
      const updated = await stripe.subscriptions.update(existingSubId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
        metadata: { user_id: userId, plan, cycle },
      });
      const quotaResult = await syncSubscriptionFromStripe(admin, userId, updated);
      if (quotaResult && quotaResult.newNotifications > 0) {
        await dispatchAfterMatch(admin).catch((e) => {
          console.error("[stripe/checkout] dispatch after upgrade failed:", e);
        });
      }
      return NextResponse.json({ ok: true, upgraded: true, plan, cycle });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/pricing?checkout=success`,
      cancel_url: `${base}/pricing?checkout=cancel`,
      billing_address_collection: "required",
      allow_promotion_codes: true,
      metadata: {
        user_id: userId,
        plan,
        cycle,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan,
          cycle,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { appBaseUrl, getStripe, stripePriceId, type BillingCycle } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/stripe-billing";
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
    const customerId = await ensureStripeCustomer(
      admin,
      stripe,
      userData.user.id,
      userData.user.email,
    );

    const priceId = stripePriceId(plan, cycle);
    const base = appBaseUrl();

    const { data: subRow } = await admin
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const existingSubId = subRow?.stripe_subscription_id as string | undefined;
    const active =
      existingSubId &&
      (subRow?.status === "active" || subRow?.status === "trialing");

    if (active && existingSubId) {
      const existing = await stripe.subscriptions.retrieve(existingSubId);
      const itemId = existing.items.data[0]?.id;
      if (!itemId) {
        return NextResponse.json({ error: "Subscription item missing" }, { status: 500 });
      }
      const updated = await stripe.subscriptions.update(existingSubId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
        metadata: { user_id: userData.user.id, plan, cycle },
      });
      const { syncSubscriptionFromStripe } = await import("@/lib/stripe-billing");
      await syncSubscriptionFromStripe(admin, userData.user.id, updated);
      return NextResponse.json({ ok: true, upgraded: true, plan });
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
        user_id: userData.user.id,
        plan,
        cycle,
      },
      subscription_data: {
        metadata: {
          user_id: userData.user.id,
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

import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import {
  subscriptionPeriodEndIso,
  syncSubscriptionFromStripe,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cancel at period end (§5 — access until current period ends). */
export async function POST() {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = getServerSupabase();
  const { data: subRow } = await admin
    .from("stripe_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const subId = subRow?.stripe_subscription_id as string | undefined;
  if (!subId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });
    await syncSubscriptionFromStripe(admin, userData.user.id, updated);
    return NextResponse.json({
      ok: true,
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: subscriptionPeriodEndIso(updated),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cancel failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

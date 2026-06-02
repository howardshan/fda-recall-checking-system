import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "./stripe";
import { resolveUserIdForSubscription, revokePaidAccess } from "./stripe-billing";
import { refundCustomerCreditOnSubscriptionEnd } from "./stripe-refund";
import { sendSubscriptionEndedEmail } from "./subscription-ended-email";

/**
 * Plan B: on subscription.deleted — refund unused credit, revoke access, email user.
 */
export async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
  stripeEventId: string,
  stripe?: Stripe,
): Promise<void> {
  const client = stripe ?? getStripe();
  const userId = await resolveUserIdForSubscription(supabase, sub);
  if (!userId) {
    console.warn("[subscription-ended] no user for subscription", sub.id);
    return;
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  let refundAmountCents: number | null = null;

  if (customerId) {
    const refund = await refundCustomerCreditOnSubscriptionEnd(supabase, {
      userId,
      subscriptionId: sub.id,
      stripeEventId,
      customerId,
      stripe: client,
    });
    if (refund.status === "success") {
      refundAmountCents = refund.amountCents;
    }
  }

  await revokePaidAccess(supabase, userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.email) {
    const userName =
      (profile.full_name as string | null)?.trim() ||
      (profile.email as string).split("@")[0];
    await sendSubscriptionEndedEmail({
      to: profile.email as string,
      userName,
      refundAmountCents,
    });
  }
}

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import {
  getCurrentBillingCycle,
  getEffectivePlan,
  resolveActiveSubscriptionId,
  type BillingCycle,
} from "@/lib/stripe-billing";
import { PlanCards } from "@/components/billing/PlanCards";
import type { Plan } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans & Pricing | SafeTrack" };

async function loadSubscriptionContext(): Promise<{
  plan: Plan;
  billingCycle: BillingCycle | null;
  signedIn: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) return { plan: "free", billingCycle: null, signedIn: false };
  const supabase = getServerSupabase();

  try {
    const stripe = getStripe();
    await resolveActiveSubscriptionId(stripe, supabase, user.id);
  } catch (e) {
    console.warn("[pricing] stripe reconcile skipped:", e);
  }

  const [plan, billingCycle] = await Promise.all([
    getEffectivePlan(supabase, user.id),
    getCurrentBillingCycle(supabase, user.id),
  ]);
  return { plan, billingCycle, signedIn: true };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { plan, billingCycle, signedIn } = await loadSubscriptionContext();
  const { checkout } = await searchParams;

  return (
    <div className="space-y-10">
      {checkout === "success" ? (
        <div className="rounded-lg border border-primary/20 bg-primary-container px-4 py-3 text-center text-body-sm text-on-primary-container">
          Payment successful — your plan is now active. Thank you!
        </div>
      ) : checkout === "cancel" ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-center text-body-sm text-on-surface-variant">
          Checkout was cancelled. You can try again whenever you&apos;re ready.
        </div>
      ) : null}
      <div className="text-center">
        <p className="mx-auto mb-4 inline-block rounded-full bg-primary-fixed px-3 py-1 text-label-md uppercase tracking-wider text-on-primary-fixed">
          FDA recall alerts before your pharmacy calls
        </p>
        <h1 className="font-display text-headline-md text-on-surface">
          Pick the plan that fits your household
        </h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          Free is enough to dip your toe in. Upgrade any time as your cabinet grows.
        </p>
        {!signedIn ? (
          <p className="mt-4 text-label-md">
            <Link href="/signup" className="text-secondary hover:underline">
              Sign up free
            </Link>{" "}
            — no card required.
          </p>
        ) : null}
      </div>

      <PlanCards
        currentPlan={signedIn ? plan : null}
        currentBillingCycle={signedIn ? billingCycle : null}
      />

      <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-3 text-body-sm text-on-surface-variant sm:grid-cols-2">
        {[
          "FDA monitored daily",
          "No credit card required for free plan",
          "Cancel anytime",
          "Secure payment by Stripe",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-primary"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.704 5.296a1 1 0 010 1.408l-7.5 7.5a1 1 0 01-1.408 0l-3.5-3.5a1 1 0 011.408-1.408L8.5 12.09l6.796-6.796a1 1 0 011.408 0z"
                clipRule="evenodd"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      <div className="card text-center">
        <h2 className="font-display text-headline-sm text-on-surface">FAQ</h2>
        <dl className="mt-4 grid grid-cols-1 gap-6 text-left md:grid-cols-2">
          <div>
            <dt className="font-medium text-on-surface">Will I be charged today?</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              Paid plans are billed through Stripe. New subscriptions use Stripe Checkout;
              plan changes open Stripe&apos;s secure payment page for any amount due today.
              Proration is calculated automatically by Stripe.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-on-surface">Can I cancel?</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              Yes — cancel anytime. Paid features remain until the end of your current
              billing period, then your account returns to Free.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-on-surface">Cancellation, balance &amp; refunds</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              Cancelling takes effect at the end of your billing period, not immediately.
              Credit from plan changes may be used toward upcoming monthly charges first.
              When your subscription ends, any unused account credit is automatically
              refunded to your original payment method (usually within 5–10 business days).
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

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
        <h1 className="font-display text-headline-md text-primary">
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

      <div className="card text-center">
        <h2 className="font-display text-headline-sm text-primary">FAQ</h2>
        <dl className="mt-4 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
          <div>
            <dt className="font-medium text-on-surface">Will I be charged today?</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              Paid plans are billed through Stripe (test mode in staging). You will enter
              payment details on Stripe&apos;s secure checkout page.
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
            <dt className="font-medium text-on-surface">What about cosmetics and food?</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              Coming next. Family Protection subscribers will get cosmetic + food recall
              monitoring as soon as it ships.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

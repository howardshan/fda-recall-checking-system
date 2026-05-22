import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { PlanCards } from "@/components/billing/PlanCards";
import type { Plan } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans & Pricing | SafeTrack" };

async function loadCurrentPlan(): Promise<{ plan: Plan; signedIn: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { plan: "free", signedIn: false };
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const raw = (data?.plan as string | undefined) ?? "free";
  const plan: Plan = raw === "personal" || raw === "family" ? raw : "free";
  return { plan, signedIn: true };
}

export default async function PricingPage() {
  const { plan, signedIn } = await loadCurrentPlan();

  return (
    <div className="space-y-10">
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

      <PlanCards currentPlan={signedIn ? plan : null} />

      <div className="card text-center">
        <h2 className="font-display text-headline-sm text-primary">FAQ</h2>
        <dl className="mt-4 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
          <div>
            <dt className="font-medium text-on-surface">Will I be charged today?</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              No. Payment is not wired up yet — upgrades take effect immediately for free during
              the beta.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-on-surface">Can I downgrade?</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">
              Yes — pick Free or Personal on this page to switch. If you exceed the new
              plan&apos;s limit, you&apos;ll be asked to remove items.
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

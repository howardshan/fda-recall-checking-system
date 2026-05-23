"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLAN_LABEL, type Plan } from "@/lib/plan";

type Cycle = "monthly" | "annual";

type PlanCard = {
  id: Plan;
  name: string;
  /** Display price for monthly view. Empty string for Free. */
  monthlyPrimary: string;
  monthlySecondary: string | null;
  /** Display price for annual view. */
  annualPrimary: string;
  annualSecondary: string | null;
  featured: boolean;
  bullets: string[];
};

const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrimary: "$0",
    monthlySecondary: "forever",
    annualPrimary: "$0",
    annualSecondary: "forever",
    featured: false,
    bullets: [
      "Track 2 medications",
      "Daily recall digest",
      "Basic email alerts",
    ],
  },
  {
    id: "personal",
    name: "Personal Pro",
    monthlyPrimary: "$4.99/mo",
    monthlySecondary: "$49.99/yr if annual",
    annualPrimary: "$49.99/yr",
    annualSecondary: "≈ $4.17/mo",
    featured: true,
    bullets: [
      "Track up to 20 medications",
      "Priority alerts",
      "Lot-number tracking",
      "Faster monitoring",
      "Future cosmetic + food monitoring",
    ],
  },
  {
    id: "family",
    name: "Family Protection",
    monthlyPrimary: "$9.99/mo",
    monthlySecondary: "$99.99/yr if annual",
    annualPrimary: "$99.99/yr",
    annualSecondary: "≈ $8.33/mo",
    featured: false,
    bullets: [
      "Up to 5 family members",
      "Shared monitoring dashboard",
      "Up to 50 tracked products",
      "Parent / child medication management",
      "Cosmetic + food alerts (coming soon)",
    ],
  },
];

function priceForCycle(p: PlanCard, cycle: Cycle): { primary: string; secondary: string | null } {
  if (cycle === "annual") return { primary: p.annualPrimary, secondary: p.annualSecondary };
  return { primary: p.monthlyPrimary, secondary: p.monthlySecondary };
}

export function PlanCards({ currentPlan }: { currentPlan: Plan | null }) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busy, setBusy] = useState<Plan | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(plan: Plan) {
    if (!currentPlan) {
      router.push(`/signup?next=/pricing`);
      return;
    }
    if (plan === currentPlan) return;

    const isDowngrade =
      (currentPlan === "family" && plan !== "family") ||
      (currentPlan === "personal" && plan === "free");
    const target = PLANS.find((p) => p.id === plan)!;
    const billed = priceForCycle(target, cycle).primary;

    const msg = isDowngrade
      ? `Downgrade to ${target.name} now? You'll lose features immediately. No prorated refund for the rest of your current cycle.`
      : plan === "free"
      ? `Switch to Free now? No refund.`
      : `Upgrade to ${target.name} now and pay ${billed}? Your previous plan ends immediately — we don't credit or refund unused time.`;
    if (!window.confirm(msg)) return;

    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function cancelSubscription() {
    if (
      !window.confirm(
        "Cancel your subscription? Your account will switch to Free immediately. You'll lose paid features now and won't be charged again — no refund for the rest of the current billing cycle.",
      )
    ) {
      return;
    }
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "free" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  const showCancel = currentPlan === "personal" || currentPlan === "family";

  return (
    <div className="space-y-6">
      {/* Cycle toggle */}
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex rounded-full border border-primary/20 bg-surface-container-low p-1 text-label-md">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-5 py-1.5 transition ${
              cycle === "monthly"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`rounded-full px-5 py-1.5 transition ${
              cycle === "annual"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Annual
          </button>
        </div>
        <p className="text-label-sm text-on-surface-variant">
          Annual saves about 17% over monthly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          const { primary, secondary } = priceForCycle(p, cycle);
          return (
            <div
              key={p.id}
              className={`card flex flex-col ${
                p.featured ? "border-2 border-primary shadow-lg" : ""
              }`}
            >
              {p.featured ? (
                <span className="mb-3 inline-block w-fit rounded-full bg-primary px-3 py-0.5 text-label-sm text-on-primary">
                  Most popular
                </span>
              ) : null}
              <h3 className="font-display text-headline-sm text-primary">{p.name}</h3>
              <p className="mt-2 font-display text-headline-md text-on-surface">{primary}</p>
              {secondary ? (
                <p className="text-label-sm text-on-surface-variant">{secondary}</p>
              ) : null}
              <ul className="mt-4 flex-1 space-y-2 text-body-sm">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <span className="btn-secondary block w-full cursor-default text-center">
                    Current plan
                  </span>
                ) : currentPlan ? (
                  <button
                    type="button"
                    className={p.featured ? "btn-primary w-full" : "btn-secondary w-full"}
                    onClick={() => switchTo(p.id)}
                    disabled={busy !== null}
                  >
                    {busy === p.id
                      ? "Switching…"
                      : p.id === "free"
                      ? "Downgrade to Free"
                      : `Switch to ${p.name}`}
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className={
                      p.featured ? "btn-primary block w-full text-center" : "btn-secondary block w-full text-center"
                    }
                  >
                    Sign up
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className="text-center text-label-md text-error">{error}</p> : null}

      <p className="text-center text-label-sm text-on-surface-variant">
        Upgrades and downgrades take effect immediately. We don&rsquo;t prorate, credit, or refund
        the unused portion of your previous plan.
      </p>

      {showCancel ? (
        <div className="card mx-auto max-w-md space-y-3 text-center">
          <h3 className="font-display text-headline-sm text-on-surface">Cancel subscription</h3>
          <p className="text-body-sm text-on-surface-variant">
            Currently on <strong>{currentPlan ? PLAN_LABEL[currentPlan] : ""}</strong>. Cancelling
            switches you back to Free immediately. No refund for the rest of the billing cycle.
          </p>
          <button
            type="button"
            onClick={cancelSubscription}
            disabled={busy !== null}
            className="btn-secondary w-full text-error hover:bg-error-container"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel subscription"}
          </button>
        </div>
      ) : null}

      {currentPlan ? (
        <p className="text-center text-label-sm text-on-surface-variant">
          Placeholder mode — plan changes are free and instant during the beta.
        </p>
      ) : null}
    </div>
  );
}

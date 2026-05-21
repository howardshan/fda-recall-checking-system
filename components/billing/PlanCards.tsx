"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Plan } from "@/lib/plan";

type PlanCard = {
  id: Plan;
  name: string;
  priceMonthly: string;
  priceAnnual: string | null;
  featured: boolean;
  bullets: string[];
};

const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: "$0",
    priceAnnual: null,
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
    priceMonthly: "$4.99/mo",
    priceAnnual: "$49.99/yr",
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
    priceMonthly: "$9.99/mo",
    priceAnnual: "$99.99/yr",
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

export function PlanCards({ currentPlan }: { currentPlan: Plan | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(plan: Plan) {
    if (!currentPlan) {
      router.push(`/signup?next=/pricing`);
      return;
    }
    if (plan === currentPlan) return;
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
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
              <p className="mt-2 font-display text-headline-md text-on-surface">
                {p.priceMonthly}
              </p>
              {p.priceAnnual ? (
                <p className="text-label-sm text-on-surface-variant">{p.priceAnnual}</p>
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
                      : currentPlan === "free" || p.id === "free"
                      ? p.id === "free"
                        ? "Downgrade to Free"
                        : `Choose ${p.name}`
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
      {currentPlan ? (
        <p className="text-center text-label-sm text-on-surface-variant">
          Placeholder mode — plan changes are free and instant during the beta.
        </p>
      ) : null}
    </div>
  );
}

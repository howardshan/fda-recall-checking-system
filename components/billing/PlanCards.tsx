"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PLAN_LABEL, type Plan } from "@/lib/plan";

type Cycle = "monthly" | "annual";

type PlanCard = {
  id: Plan;
  name: string;
  monthlyPrimary: string;
  monthlySecondary: string | null;
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
      "Instant + digest email options",
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
      "Instant recall alerts",
      "Lot-number tracking",
      "SMS opt-in (Class I & II)",
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
      "Up to 50 tracked products",
      "Shared monitoring dashboard",
      "All Personal Pro features",
    ],
  },
];

function priceForCycle(p: PlanCard, cycle: Cycle): { primary: string; secondary: string | null } {
  if (cycle === "annual") return { primary: p.annualPrimary, secondary: p.annualSecondary };
  return { primary: p.monthlyPrimary, secondary: p.monthlySecondary };
}

async function startCheckout(plan: Plan, cycle: Cycle): Promise<{ ok: boolean; url?: string; error?: string }> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, cycle }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    upgraded?: boolean;
  };
  if (!res.ok) return { ok: false, error: json.error ?? `Failed (${res.status})` };
  if (json.url) {
    window.location.href = json.url;
    return { ok: true };
  }
  return { ok: true };
}

export function PlanCards({ currentPlan }: { currentPlan: Plan | null }) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busy, setBusy] = useState<Plan | "cancel" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  async function executeCancel() {
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Failed (${res.status})`);
        return;
      }
      setCancelDialogOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function switchTo(plan: Plan) {
    if (!currentPlan) {
      router.push(`/signup?next=/pricing`);
      return;
    }
    if (plan === currentPlan) return;

    if (plan === "free") {
      setCancelDialogOpen(true);
      return;
    }

    setBusy(plan);
    setError(null);
    try {
      const result = await startCheckout(plan, cycle);
      if (!result.ok) {
        setError(result.error ?? "Checkout failed");
        return;
      }
      if (!result.url) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not open billing portal");
        return;
      }
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  const showCancel = currentPlan === "personal" || currentPlan === "family";

  return (
    <>
      <ConfirmDialog
        open={cancelDialogOpen}
        title="Cancel subscription?"
        description="You will keep paid features until the end of your current billing period, then your account returns to the Free plan. You will not be charged again."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep my plan"
        variant="danger"
        busy={busy === "cancel"}
        onConfirm={() => void executeCancel()}
        onCancel={() => setCancelDialogOpen(false)}
      />

    <div className="space-y-6">
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
                      ? "Processing…"
                      : p.id === "free"
                      ? "Downgrade to Free"
                      : `Subscribe — ${p.name}`}
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
        Upgrades take effect immediately. Cancellations keep access until the end of the
        current billing period. Payment failures suspend paid features right away.
      </p>

      {showCancel ? (
        <div className="card mx-auto max-w-md space-y-3 text-center">
          <h3 className="font-display text-headline-sm text-on-surface">Manage billing</h3>
          <p className="text-body-sm text-on-surface-variant">
            Currently on <strong>{currentPlan ? PLAN_LABEL[currentPlan] : ""}</strong>.
            Update payment method or cancel via Stripe.
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={busy !== null}
            className="btn-secondary w-full"
          >
            {busy === "portal" ? "Opening…" : "Stripe billing portal"}
          </button>
          <button
            type="button"
            onClick={() => switchTo("free")}
            disabled={busy !== null}
            className="btn-secondary w-full text-error hover:bg-error-container"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel at period end"}
          </button>
        </div>
      ) : null}
    </div>
    </>
  );
}

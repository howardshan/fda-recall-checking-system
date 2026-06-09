"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { BillingCycle } from "@/lib/stripe-billing";
import { PLAN_LABEL, type Plan } from "@/lib/plan";

type Cycle = BillingCycle;

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

type PlanChangePreview = {
  hasActiveSubscription: boolean;
  current?: {
    plan: string | null;
    cycle: string | null;
    priceId: string;
    amountCents: number;
    currency: string;
    interval: string | null;
  };
  target: {
    plan: Plan;
    cycle: Cycle;
    priceId: string;
    amountCents?: number;
    currency?: string;
    interval?: string | null;
  };
  estimate: {
    amountDueNowCents: number;
    totalCents: number;
    subtotalCents?: number;
    prorationCents: number;
    lineItems: Array<{
      description: string;
      amountCents: number;
      proration: boolean;
    }>;
  };
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
      "Weekly digest",
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
      "Email notifications",
      "Priority monitoring",
      "Instant recall alerts",
      "Lot number tracking",
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
      "Everything in Personal Pro",
      "Track up to 100 medications",
      "Ideal for households managing multiple medications",
      "Enhanced monitoring capacity",
      "Priority family alerts",
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

function cycleLabel(cycle: Cycle): string {
  return cycle === "annual" ? "annual" : "monthly";
}

function prettyCycle(cycle: string | null | undefined): string {
  if (cycle === "annual" || cycle === "year") return "Annual";
  return "Monthly";
}

function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents ?? 0) / 100);
}

async function previewPlanChange(
  plan: Plan,
  cycle: Cycle,
): Promise<{ ok: boolean; data?: PlanChangePreview; error?: string }> {
  const res = await fetch("/api/stripe/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, cycle }),
  });
  const json = (await res.json().catch(() => ({}))) as PlanChangePreview & {
    error?: string;
  };
  if (!res.ok) return { ok: false, error: json.error ?? `Failed (${res.status})` };
  return { ok: true, data: json };
}

export function PlanCards({
  currentPlan,
  currentBillingCycle,
}: {
  currentPlan: Plan | null;
  currentBillingCycle?: BillingCycle | null;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>(currentBillingCycle ?? "monthly");
  const [busy, setBusy] = useState<Plan | "cancel" | "portal" | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [changeDialog, setChangeDialog] = useState<{
    plan: Plan;
    planName: string;
    billed: string;
    cycle: Cycle;
    preview?: PlanChangePreview;
  } | null>(null);

  function isCurrentPlanAndCycle(plan: Plan): boolean {
    if (currentPlan !== plan) return false;
    if (plan === "free") return true;
    return currentBillingCycle === cycle;
  }

  function isBillingCycleSwitch(plan: Plan): boolean {
    if (currentPlan !== plan) return false;
    if (plan === "free") return false;
    if (!currentBillingCycle) return false;
    return currentBillingCycle !== cycle;
  }

  async function executeCheckout(plan: Plan) {
    setBusy(plan);
    setError(null);
    try {
      const result = await startCheckout(plan, cycle);
      if (!result.ok) {
        setError(result.error ?? "Checkout failed");
        return;
      }
      setChangeDialog(null);
      if (!result.url) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

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

    if (plan === "free") {
      setCancelDialogOpen(true);
      return;
    }

    if (isCurrentPlanAndCycle(plan)) return;

    const target = PLANS.find((p) => p.id === plan)!;
    const { primary: billed } = priceForCycle(target, cycle);
    setPreviewBusy(true);
    setError(null);
    try {
      const preview = await previewPlanChange(plan, cycle);
      if (!preview.ok) {
        setError(preview.error ?? "Could not preview billing change");
        return;
      }
      setChangeDialog({
        plan,
        planName: target.name,
        billed,
        cycle,
        preview: preview.data,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPreviewBusy(false);
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
        description="You will keep paid features until the end of your current billing period, then your account returns to the Free plan. You will not be charged again. If you have account credit from a plan change, it may be applied to monthly charges before your period ends; any unused credit after your subscription ends will be refunded automatically to your original payment method (typically within 5–10 business days). Cancellation is not immediate."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep my plan"
        variant="danger"
        busy={busy === "cancel"}
        onConfirm={() => void executeCancel()}
        onCancel={() => setCancelDialogOpen(false)}
      />

      <ConfirmDialog
        open={changeDialog !== null}
        title={changeDialog ? "Confirm plan change" : ""}
        description="Changes apply immediately. Final billing is calculated by Stripe at confirmation time."
        size="lg"
        details={
          changeDialog ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <p className="text-label-sm text-on-surface-variant">Current</p>
                  <p className="mt-1 font-display text-headline-sm text-on-surface">
                    {currentPlan ? PLAN_LABEL[currentPlan] : "Unknown"}
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {prettyCycle(currentBillingCycle)}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary-container/20 p-4">
                  <p className="text-label-sm text-on-surface-variant">After change</p>
                  <p className="mt-1 font-display text-headline-sm text-on-surface">
                    {changeDialog.planName}
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {prettyCycle(changeDialog.cycle)} · {changeDialog.billed}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-surface-container p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-label-sm text-on-surface-variant">Estimated due now</p>
                  <p className="font-display text-headline-sm text-primary">
                    {formatMoney(
                      changeDialog.preview?.estimate.amountDueNowCents ?? 0,
                      changeDialog.preview?.current?.currency ??
                        changeDialog.preview?.target.currency ??
                        "usd",
                    )}
                  </p>
                </div>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Includes prorated credits/charges where applicable.
                </p>
                {(changeDialog.preview?.estimate.lineItems?.length ?? 0) > 0 ? (
                  <div className="mt-3 space-y-2 rounded-md border border-outline-variant p-3">
                    {changeDialog.preview?.estimate.lineItems.map((line, idx) => (
                      <div key={`${line.description}-${idx}`} className="flex justify-between gap-3 text-body-sm">
                        <span className="text-on-surface-variant">
                          {line.description}
                          {line.proration ? " (proration)" : ""}
                        </span>
                        <span className={line.amountCents < 0 ? "text-tertiary" : "text-on-surface"}>
                          {formatMoney(
                            line.amountCents,
                            changeDialog.preview?.current?.currency ??
                              changeDialog.preview?.target.currency ??
                              "usd",
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null
        }
        confirmLabel={
          changeDialog
            ? `Confirm — ${changeDialog.planName} ${prettyCycle(changeDialog.cycle)}`
            : "Confirm"
        }
        cancelLabel="Not now"
        busy={changeDialog !== null && busy === changeDialog.plan}
        onConfirm={() => {
          if (changeDialog) void executeCheckout(changeDialog.plan);
        }}
        onCancel={() => setChangeDialog(null)}
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
          const isCurrent = isCurrentPlanAndCycle(p.id);
          const cycleSwitch = isBillingCycleSwitch(p.id);
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
              <h3 className="font-display text-headline-sm text-on-surface">{p.name}</h3>
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
                ) : cycleSwitch ? (
                  <button
                    type="button"
                    className={p.featured ? "btn-primary w-full" : "btn-secondary w-full"}
                    onClick={() => switchTo(p.id)}
                    disabled={busy !== null || previewBusy}
                  >
                    {busy === p.id
                      ? "Processing…"
                      : previewBusy
                      ? "Calculating…"
                      : `Switch to ${cycleLabel(cycle)} — ${primary}`}
                  </button>
                ) : currentPlan ? (
                  <button
                    type="button"
                    className={p.featured ? "btn-primary w-full" : "btn-secondary w-full"}
                    onClick={() => switchTo(p.id)}
                    disabled={busy !== null || previewBusy}
                  >
                    {busy === p.id
                      ? "Processing…"
                      : previewBusy
                      ? "Calculating…"
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
            Currently on <strong>{currentPlan ? PLAN_LABEL[currentPlan] : ""}</strong>
            {currentBillingCycle ? (
              <>
                {" "}
                · <strong>{cycleLabel(currentBillingCycle)}</strong> billing
              </>
            ) : null}
            . Update payment method or cancel via Stripe.
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

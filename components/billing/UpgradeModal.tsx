"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLAN_LABEL, QUOTAS, type Plan } from "@/lib/plan";

export type QuotaError = {
  resource: "meds" | "familyMembers";
  currentPlan: Plan;
  limit: number;
  upgradeTo: Plan | null;
};

type Props = {
  error: QuotaError;
  onClose: () => void;
  onUpgraded?: (newPlan: Plan) => void;
};

const COPY: Record<
  "meds" | "familyMembers",
  Record<Plan, { title: string; body: string }>
> = {
  meds: {
    free: {
      title: "Upgrade to Personal Pro",
      body: "Free accounts can track up to 2 medications. Subscribe to Personal Pro for up to 20 medications with instant alerts.",
    },
    personal: {
      title: "Upgrade to Family Protection",
      body: "Personal Pro tracks up to 20 medications. Upgrade to Family Protection for 50 products across up to 5 family members.",
    },
    family: {
      title: "Plan limit reached",
      body: "Family Protection includes 50 tracked products — the highest tier. Remove an item from your cabinet to add a new one.",
    },
  },
  familyMembers: {
    free: {
      title: "Upgrade to Family Protection",
      body: "Family members are part of the Family Protection plan. Subscribe to add up to 5 members.",
    },
    personal: {
      title: "Upgrade to Family Protection",
      body: "Personal Pro is for one person. Upgrade to Family Protection for family members and 50 tracked products.",
    },
    family: {
      title: "Plan limit reached",
      body: "Family Protection includes up to 5 family members. Remove a member before adding a new one.",
    },
  },
};

export function UpgradeModal({ error, onClose, onUpgraded }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const copy = COPY[error.resource][error.currentPlan];

  async function upgrade() {
    if (!error.upgradeTo) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: error.upgradeTo, cycle: "monthly" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        upgraded?: boolean;
        plan?: Plan;
      };
      if (!res.ok) {
        setErr(json.error ?? `Failed (${res.status})`);
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      if (json.upgraded && json.plan) {
        onUpgraded?.(json.plan);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  const canUpgrade = error.upgradeTo !== null;
  const target = error.upgradeTo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-headline-sm text-primary">{copy.title}</h2>
        <p className="text-body-md text-on-surface-variant">{copy.body}</p>

        {canUpgrade && target ? (
          <div className="rounded-lg border border-primary/10 bg-surface-container-low p-3 text-body-sm">
            <p className="font-medium text-on-surface">{PLAN_LABEL[target]}</p>
            <ul className="mt-1 list-disc pl-5 text-on-surface-variant">
              <li>{QUOTAS[target].meds} medications</li>
              {QUOTAS[target].familyMembers > 0 ? (
                <li>{QUOTAS[target].familyMembers} family members</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {err ? <p className="text-label-md text-error">{err}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {canUpgrade ? "Not now" : "Close"}
          </button>
          {canUpgrade ? (
            <button
              type="button"
              className="btn-primary"
              onClick={upgrade}
              disabled={busy}
            >
              {busy ? "Redirecting…" : `Subscribe — ${target ? PLAN_LABEL[target] : ""}`}
            </button>
          ) : null}
          <Link
            href="/pricing"
            className="self-center text-label-md text-secondary hover:underline"
          >
            See all plans →
          </Link>
        </div>
      </div>
    </div>
  );
}

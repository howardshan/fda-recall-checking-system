"use client";

import { useState } from "react";
import Link from "next/link";
import { ManualInputTab, type ManualInputValues } from "./ManualInputTab";
import { ResultPanel } from "./ResultPanel";
import { Disclaimer } from "./Disclaimer";
import type { CheckRecallResult } from "@/lib/check-recall";

type QuotaInfo =
  | { unlimited: true }
  | { used: number; limit: number };

type CheckResponse = CheckRecallResult & {
  lastSyncedAt: string | null;
  quota?: QuotaInfo;
};

type LoginRequired = {
  error: "login_required";
  message: string;
  quota: { used: number; limit: number };
};

type RecallCheckerProps = {
  isLoggedIn?: boolean;
};

export function RecallChecker({ isLoggedIn = false }: RecallCheckerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [gated, setGated] = useState<LoginRequired | null>(null);

  function reset() {
    setResult(null);
    setError(null);
  }

  async function handleSubmit(values: ManualInputValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/check-recall?inputMethod=manual`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName: values.productName,
          manufacturer: values.manufacturer || null,
          ndc: values.ndc || null,
          lotNumber: values.lotNumber || null,
        }),
      });
      const json = (await res.json()) as
        | (CheckResponse & { error?: string })
        | LoginRequired;

      if (res.status === 401 && "error" in json && json.error === "login_required") {
        setGated(json as LoginRequired);
        return;
      }
      if (!res.ok) {
        const msg = "error" in json && json.error ? json.error : "Check failed";
        throw new Error(typeof msg === "string" ? msg : "Check failed");
      }
      const ok = json as CheckResponse;
      setResult(ok);
      if (ok.quota) setQuota(ok.quota);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Hard gate: out of quota → show sign-in prompt instead of the form.
  if (gated) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border-2 border-secondary bg-secondary-fixed p-6 text-on-secondary-fixed-variant">
          <h2 className="font-display text-headline-sm">Sign in to keep checking</h2>
          <p className="mt-2 text-body-md">{gated.message}</p>
          <p className="mt-2 text-label-sm opacity-80">
            You used {gated.quota.used} of {gated.quota.limit} free quick checks on this device.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary">
              Create a free account
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-label-sm">
            With an account you also get email alerts when the FDA recalls a
            medication in your cabinet — not just one-off lookups.
          </p>
        </div>
        <Disclaimer />
      </div>
    );
  }

  const remaining =
    quota && "limit" in quota ? Math.max(0, quota.limit - quota.used) : null;

  return (
    <div className="space-y-6">
      {result ? (
        <ResultPanel result={result} onReset={reset} isLoggedIn={isLoggedIn} />
      ) : (
        <>
          <ManualInputTab onSubmit={handleSubmit} submitting={submitting} />
          {error ? (
            <div className="rounded-md border border-error/30 bg-error-container p-3 text-label-sm text-on-error-container">
              {error}
            </div>
          ) : null}
        </>
      )}

      {result && remaining != null && !isLoggedIn ? (
        <div className="rounded-md border border-primary/10 bg-surface-container-low p-3 text-label-sm text-on-surface-variant">
          {remaining > 0
            ? `${remaining} free quick check${remaining === 1 ? "" : "s"} remaining on this device.`
            : "You've used your free quick checks on this device."}
        </div>
      ) : null}

      <Disclaimer />
    </div>
  );
}

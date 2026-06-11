"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { CheckRecallResult, RecallMatch } from "@/lib/check-recall";
import { recallClassChipClass } from "@/lib/recall-classification";

type Props = {
  result: CheckRecallResult & { lastSyncedAt: string | null };
  onReset: () => void;
  isLoggedIn?: boolean;
};

function classLabelLong(c: string | null): string {
  if (!c) return "Unclassified";
  if (/class\s*iii\b/i.test(c)) return "Class III — Low Risk";
  if (/class\s*ii\b/i.test(c)) return "Class II — Moderate Risk";
  if (/class\s*i\b/i.test(c)) return "Class I — Serious Risk";
  return c;
}

function formatRecallDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function productTitle(m: RecallMatch): string {
  return m.brandName || m.genericName || m.productDescription || "(unnamed)";
}

function manufacturerName(m: RecallMatch): string {
  return m.manufacturerName || m.recallingFirm || "—";
}

function matchRank(m: RecallMatch): number {
  let score = m.productScore + m.firmScore;
  if (m.ndcExact) score += 10;
  if (m.lotMatch === true) score += 5;
  return score;
}

function sortMatches(matches: RecallMatch[]): RecallMatch[] {
  return [...matches].sort((a, b) => matchRank(b) - matchRank(a));
}

function KeyFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-1 text-body-md text-on-surface">{children}</dd>
    </div>
  );
}

function MatchCard({ m }: { m: RecallMatch }) {
  const title = productTitle(m);

  return (
    <article className="card space-y-5">
      <div>
        <h3 className="font-display text-headline-sm text-on-surface">{title}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {m.ndcExact ? (
            <span className="chip bg-error-container text-on-error-container">
              NDC exact match
            </span>
          ) : null}
          {m.lotMatch === true ? (
            <span className="chip bg-error-container text-on-error-container">
              Lot matched
            </span>
          ) : null}
          {m.lotMatch === false ? (
            <span className="chip bg-surface-container-high text-on-surface">
              Lot not in scope
            </span>
          ) : null}
          {m.status ? (
            <span className="chip bg-surface-container-high text-on-surface">
              {m.status}
            </span>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KeyFact label="Recall Class">
          <span className={recallClassChipClass(m.classification)}>
            {classLabelLong(m.classification)}
          </span>
        </KeyFact>
        <KeyFact label="Recall Date">{formatRecallDate(m.recallInitiationDate)}</KeyFact>
        <KeyFact label="Manufacturer">{manufacturerName(m)}</KeyFact>
        <KeyFact label="Reason">{m.reasonForRecall ?? "—"}</KeyFact>
      </dl>

      <details className="group rounded-lg border border-primary/10 bg-surface-container-low">
        <summary className="cursor-pointer list-none px-4 py-3 text-label-md font-semibold text-secondary [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            View Full FDA Report
            <span
              className="text-on-surface-variant transition group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-primary/10 px-4 py-4 text-body-md">
          {m.productDescription && m.productDescription !== title ? (
            <div>
              <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Product description
              </p>
              <p className="mt-1 text-on-surface">{m.productDescription}</p>
            </div>
          ) : null}

          {m.recallingFirm && m.recallingFirm !== m.manufacturerName ? (
            <div>
              <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Recalling firm
              </p>
              <p className="mt-1 text-on-surface">{m.recallingFirm}</p>
            </div>
          ) : null}

          {m.codeInfo ? (
            <div>
              <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Lot info
              </p>
              <p className="mt-1 whitespace-pre-wrap font-mono text-label-sm text-on-surface">
                {m.codeInfo}
              </p>
            </div>
          ) : null}

          {m.productNdc && m.productNdc.length > 0 ? (
            <div>
              <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                NDCs affected
              </p>
              <p className="mt-1 font-mono text-label-sm text-on-surface">
                {m.productNdc.join(", ")}
              </p>
            </div>
          ) : null}

          {m.distributionPattern ? (
            <div>
              <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Distribution
              </p>
              <p className="mt-1 text-on-surface">{m.distributionPattern}</p>
            </div>
          ) : null}

          <div className="text-label-sm text-on-surface-variant">
            Recall #<span className="font-mono">{m.recallNumber}</span>
            {!m.ndcExact ? (
              <>
                {" "}
                · product match {m.productScore.toFixed(2)} · firm match{" "}
                {m.firmScore.toFixed(2)}
              </>
            ) : null}
          </div>

          <Link
            href={`/recalls/${encodeURIComponent(m.recallNumber)}`}
            className="inline-flex text-label-md font-semibold text-secondary hover:underline"
          >
            Open full recall page →
          </Link>
        </div>
      </details>
    </article>
  );
}

function StatusBanner({
  status,
  ndcSearched,
}: {
  status: CheckRecallResult["status"];
  ndcSearched?: boolean;
}) {
  if (status === "recalled") {
    return (
      <div className="rounded-lg border-2 border-error bg-error-container p-6 text-on-error-container">
        <h2 className="font-display text-headline-sm">FDA Recall Record Found</h2>
        <p className="mt-2 text-body-md">
          This medication appears in the FDA recall database. Consult your pharmacist
          or physician before changing or stopping medication.
        </p>
      </div>
    );
  }

  if (status === "possible") {
    return (
      <div className="rounded-lg border-2 border-secondary bg-secondary-fixed p-6 text-on-secondary-fixed-variant">
        <h2 className="font-display text-headline-sm">Possible Recall Match — Needs More Info</h2>
        <p className="mt-2 text-body-md">
          We found similar recall records but cannot confirm they apply to your
          medication. Add an NDC and lot number for a more precise answer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-primary bg-primary-fixed p-6 text-on-primary-fixed-variant">
      <h2 className="font-display text-headline-sm">No FDA Recall Found</h2>
      {ndcSearched ? (
        <p className="mt-2 text-body-md">
          The NDC you provided is not in our recall database. Clear the NDC field
          to check other manufacturers of the same drug.
        </p>
      ) : (
        <>
          <p className="mt-2 text-body-md">
            No active FDA recall was found for this medication.
          </p>
          <p className="mt-2 text-body-md">
            SafeTrack continuously updates recall information from FDA sources.
            Create a free account to receive alerts if this changes in the future.
          </p>
        </>
      )}
    </div>
  );
}

function ResultCta({
  status,
  isLoggedIn,
}: {
  status: CheckRecallResult["status"];
  isLoggedIn: boolean;
}) {
  if (isLoggedIn) {
    if (status !== "recalled") return null;
    return (
      <section className="card space-y-4 border-primary/10 bg-surface-container-lowest">
        <h3 className="font-display text-headline-sm text-on-surface">
          Add to your medicine cabinet
        </h3>
        <p className="text-body-md text-on-surface-variant">
          Save this medication to your cabinet and receive automatic FDA recall
          alerts if new matches appear.
        </p>
        <Link href="/cabinet/add" className="btn-primary inline-flex w-full sm:w-auto">
          Add to medicine cabinet
        </Link>
      </section>
    );
  }

  if (status === "recalled") {
    return (
      <section className="card space-y-4 border-primary/10 bg-surface-container-lowest">
        <h3 className="font-display text-headline-sm text-on-surface">
          Want ongoing monitoring?
        </h3>
        <p className="text-body-md text-on-surface-variant">
          Add this medication to your medicine cabinet and get notified when FDA
          recall information changes.
        </p>
        <p className="text-body-md text-on-surface-variant">
          Create a free SafeTrack account to track medications and receive
          automatic recall alerts.
        </p>
        <Link href="/signup" className="btn-primary inline-flex w-full sm:w-auto">
          Get Free Alerts
        </Link>
      </section>
    );
  }

  if (status === "not_found" || status === "possible") {
    return (
      <section className="card space-y-4 border-primary/10 bg-surface-container-lowest">
        <h3 className="font-display text-headline-sm text-on-surface">
          Want ongoing protection?
        </h3>
        <p className="text-body-md text-on-surface-variant">
          Get notified if this medication is recalled in the future.
        </p>
        <p className="text-body-md text-on-surface-variant">
          Create a free SafeTrack account and receive automatic FDA recall alerts.
        </p>
        <Link href="/signup" className="btn-primary inline-flex w-full sm:w-auto">
          Get Free Alerts
        </Link>
      </section>
    );
  }

  return null;
}

export function ResultPanel({ result, onReset, isLoggedIn = false }: Props) {
  const { status, matches, lastSyncedAt } = result;
  const sortedMatches = sortMatches(matches);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button type="button" onClick={onReset} className="btn-secondary">
          ← Check another
        </button>
      </div>

      <StatusBanner status={status} ndcSearched={result.ndcSearched} />

      <ResultCta status={status} isLoggedIn={isLoggedIn} />

      {sortedMatches.length > 0 ? (
        <div className="space-y-4">
          {sortedMatches.length > 1 ? (
            <p className="text-label-md text-on-surface-variant">
              {sortedMatches.length} matching recall records — showing most relevant first
            </p>
          ) : null}
          {sortedMatches.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-primary/10 pt-3 text-label-sm text-on-surface-variant">
        <span>
          Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
        </span>
        <button type="button" onClick={onReset} className="btn-ghost">
          Check another ↻
        </button>
      </div>
    </div>
  );
}

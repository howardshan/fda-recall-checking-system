"use client";

import type { CheckRecallResult, RecallMatch } from "@/lib/check-recall";

type Props = {
  result: CheckRecallResult & { lastSyncedAt: string | null };
  onReset: () => void;
};

function classChipClass(c: string | null): string {
  if (!c) return "chip bg-surface-container-high text-on-surface";
  if (/class\s*iii\b/i.test(c)) return "chip chip-iii";
  if (/class\s*ii\b/i.test(c)) return "chip chip-ii";
  if (/class\s*i\b/i.test(c)) return "chip chip-i";
  return "chip bg-surface-container-high text-on-surface";
}

function classLabel(c: string | null): string {
  if (!c) return "Unclassified";
  if (/class\s*iii\b/i.test(c)) return "Class III — Low Risk";
  if (/class\s*ii\b/i.test(c)) return "Class II — Moderate Risk";
  if (/class\s*i\b/i.test(c)) return "Class I — Serious Risk";
  return c;
}

function MatchCard({ m }: { m: RecallMatch }) {
  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={classChipClass(m.classification)}>
          {classLabel(m.classification)}
        </span>
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
        <span className="ml-auto text-label-sm text-on-surface-variant">
          {m.status ?? ""} · {m.recallInitiationDate ?? ""}
        </span>
      </div>

      <div>
        <h4 className="font-display text-headline-sm text-primary">
          {m.brandName || m.genericName || m.productDescription || "(unnamed)"}
        </h4>
        {m.productDescription &&
        m.productDescription !== (m.brandName || m.genericName) ? (
          <p className="mt-1 text-label-sm text-on-surface-variant">{m.productDescription}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-2 text-label-sm sm:grid-cols-2">
        <div>
          <dt className="opacity-70 text-on-surface-variant">Reason</dt>
          <dd className="text-on-surface">{m.reasonForRecall ?? "—"}</dd>
        </div>
        <div>
          <dt className="opacity-70 text-on-surface-variant">Recalling firm</dt>
          <dd className="text-on-surface">{m.recallingFirm ?? "—"}</dd>
        </div>
        {m.codeInfo ? (
          <div className="sm:col-span-2">
            <dt className="opacity-70 text-on-surface-variant">Lot info (code_info)</dt>
            <dd className="whitespace-pre-wrap font-mono text-label-sm text-on-surface">
              {m.codeInfo}
            </dd>
          </div>
        ) : null}
        {m.productNdc && m.productNdc.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="opacity-70 text-on-surface-variant">NDCs affected</dt>
            <dd className="font-mono text-label-sm text-on-surface">
              {m.productNdc.join(", ")}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="border-t border-primary/10 pt-3 text-label-sm text-on-surface-variant">
        Recall #<span className="font-mono">{m.recallNumber}</span>
        {!m.ndcExact ? (
          <>
            {" "}· product match {m.productScore.toFixed(2)} · firm match{" "}
            {m.firmScore.toFixed(2)}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ResultPanel({ result, onReset }: Props) {
  const { status, matches, lastSyncedAt } = result;

  const header =
    status === "recalled" ? (
      <div className="rounded-lg border-2 border-error bg-error-container p-6 text-on-error-container">
        <h2 className="font-display text-headline-sm">⚠ Recall match found</h2>
        <p className="mt-2 text-body-md">
          This medication (or its NDC) is in the FDA recall database. Stop using
          it and contact your pharmacist or physician.
        </p>
      </div>
    ) : status === "possible" ? (
      <div className="rounded-lg border-2 border-secondary bg-secondary-fixed p-6 text-on-secondary-fixed-variant">
        <h2 className="font-display text-headline-sm">? Possible match</h2>
        <p className="mt-2 text-body-md">
          We found similar-looking recall records but cannot confirm they apply
          to your medication. Provide an NDC and lot number for a precise
          answer.
        </p>
      </div>
    ) : (
      <div className="rounded-lg border-2 border-primary/30 bg-surface-container-low p-6 text-on-surface">
        <h2 className="font-display text-headline-sm text-primary">✓ No recall found</h2>
        {result.ndcSearched ? (
          <p className="mt-2 text-body-md">
            The <strong>NDC</strong> you provided is not in the recall database.
            Want to check other manufacturers of the same drug? Clear the NDC
            field and try again.
          </p>
        ) : (
          <p className="mt-2 text-body-md">
            No matching recall records were found.{" "}
            <strong>This does not guarantee safety</strong> — it only means our
            data has no match.
          </p>
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button type="button" onClick={onReset} className="btn-secondary">
          ← Check another
        </button>
      </div>

      {header}

      {matches.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-label-md text-on-surface-variant uppercase">
            Matching recall records ({matches.length})
          </h3>
          {matches.map((m) => (
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

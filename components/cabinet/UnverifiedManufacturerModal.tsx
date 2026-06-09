"use client";

type MedicationSummary = {
  productName: string;
  manufacturer: string;
  productNdc?: string | null;
  lotNumber?: string | null;
};

type Props = {
  message: string;
  medication: MedicationSummary;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function WarningIcon() {
  return (
    <svg
      aria-hidden
      className="h-6 w-6 shrink-0 text-error"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      />
    </svg>
  );
}

export function UnverifiedManufacturerModal({
  message,
  medication,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unverified-mfr-title"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md space-y-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <WarningIcon />
          <div className="space-y-1">
            <h2
              id="unverified-mfr-title"
              className="font-display text-headline-sm text-on-surface"
            >
              Manufacturer not verified
            </h2>
            <p className="text-body-md text-on-surface-variant">{message}</p>
          </div>
        </div>

        <div className="rounded-lg border border-primary/10 bg-surface-container-low p-4">
          <p className="text-label-md uppercase tracking-wider text-on-surface-variant">
            Your entry
          </p>
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="text-label-sm text-on-surface-variant">Product name</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{medication.productName}</dd>
            </div>
            <div>
              <dt className="text-label-sm text-on-surface-variant">Manufacturer</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{medication.manufacturer}</dd>
            </div>
            {medication.productNdc ? (
              <div>
                <dt className="text-label-sm text-on-surface-variant">NDC</dt>
                <dd className="mt-0.5 font-mono text-body-md text-on-surface">
                  {medication.productNdc}
                </dd>
              </div>
            ) : null}
            {medication.lotNumber ? (
              <div>
                <dt className="text-label-sm text-on-surface-variant">Lot number</dt>
                <dd className="mt-0.5 font-mono text-body-md text-on-surface">
                  {medication.lotNumber}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="rounded-lg border border-error/20 bg-error-container px-3 py-2.5 text-label-sm text-on-error-container">
          This entry will be saved to your cabinet, but recall monitoring and alerts will
          not apply until the product and manufacturer match our FDA directory.
        </div>

        <p className="text-label-sm text-on-surface-variant">
          Tip: pick both fields from the dropdown suggestions for the most accurate match.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Go back and edit
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Saving…" : "Save without monitoring"}
          </button>
        </div>
      </div>
    </div>
  );
}

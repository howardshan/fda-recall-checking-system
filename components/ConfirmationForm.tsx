"use client";

import { useEffect, useState } from "react";

export type ConfirmationFormValues = {
  productName: string;
  manufacturer: string;
  ndc: string;
  lotNumber: string;
};

export type ConfirmationFormProps = {
  initial: Partial<ConfirmationFormValues>;
  candidates?: Array<{
    productName: string | null;
    manufacturer: string | null;
    ndc: string | null;
    score?: number;
  }>;
  onSubmit: (values: ConfirmationFormValues) => void;
  onBack: () => void;
  submitting?: boolean;
};

export function ConfirmationForm({
  initial,
  candidates,
  onSubmit,
  onBack,
  submitting,
}: ConfirmationFormProps) {
  const [values, setValues] = useState<ConfirmationFormValues>({
    productName: initial.productName ?? "",
    manufacturer: initial.manufacturer ?? "",
    ndc: initial.ndc ?? "",
    lotNumber: initial.lotNumber ?? "",
  });

  useEffect(() => {
    setValues({
      productName: initial.productName ?? "",
      manufacturer: initial.manufacturer ?? "",
      ndc: initial.ndc ?? "",
      lotNumber: initial.lotNumber ?? "",
    });
  }, [initial.productName, initial.manufacturer, initial.ndc, initial.lotNumber]);

  function update<K extends keyof ConfirmationFormValues>(
    key: K,
    val: ConfirmationFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function applyCandidate(idx: number) {
    const c = candidates?.[idx];
    if (!c) return;
    setValues((v) => ({
      ...v,
      productName: c.productName ?? v.productName,
      manufacturer: c.manufacturer ?? v.manufacturer,
      ndc: c.ndc ?? v.ndc,
    }));
  }

  const canSubmit = values.productName.trim().length > 0 || values.ndc.trim().length > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        onSubmit(values);
      }}
    >
      <p className="text-body-md text-on-surface-variant">
        Verify the details, then run the recall check.
      </p>

      {candidates && candidates.length > 1 ? (
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">
            Suggested matches
          </label>
          <select
            className="input bg-surface-container-lowest"
            onChange={(e) => applyCandidate(Number.parseInt(e.target.value, 10))}
            defaultValue=""
          >
            <option value="" disabled>
              Select to fill the form…
            </option>
            {candidates.map((c, i) => (
              <option key={i} value={i}>
                {(c.productName ?? "(no name)") + " — " + (c.manufacturer ?? "(no manufacturer)")}
                {c.score != null ? ` (${c.score.toFixed(2)})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">
          Product name <span className="text-error">*</span>
        </label>
        <input
          type="text"
          autoFocus
          required
          value={values.productName}
          onChange={(e) => update("productName", e.target.value)}
          placeholder="e.g. Amoxicillin"
          className="input bg-surface-container-lowest"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">Manufacturer</label>
        <input
          type="text"
          value={values.manufacturer}
          onChange={(e) => update("manufacturer", e.target.value)}
          placeholder="e.g. Sandoz Inc"
          className="input bg-surface-container-lowest"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">
            NDC <span className="text-on-surface-variant">(optional)</span>
          </label>
          <input
            type="text"
            value={values.ndc}
            onChange={(e) => update("ndc", e.target.value)}
            placeholder="0093-4155-01"
            className="input font-mono bg-surface-container-low"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">
            Lot number <span className="text-on-surface-variant">(optional)</span>
          </label>
          <input
            type="text"
            value={values.lotNumber}
            onChange={(e) => update("lotNumber", e.target.value)}
            placeholder="AB1234"
            className="input font-mono bg-surface-container-low"
          />
        </div>
      </div>

      <p className="text-label-sm text-on-surface-variant">
        Providing NDC and lot number significantly improves accuracy.
      </p>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Edit
        </button>
        <button type="submit" disabled={!canSubmit || submitting} className="btn-primary flex-1">
          {submitting ? "Checking…" : "Check recall status"}
        </button>
      </div>
    </form>
  );
}

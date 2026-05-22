"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductTypeahead } from "@/components/ProductTypeahead";
import { ManufacturerTypeahead, type ManufacturerSuggestion } from "@/components/ManufacturerTypeahead";
import { UpgradeModal, type QuotaError } from "@/components/billing/UpgradeModal";

export type MedicationFormValues = {
  productName: string;
  manufacturer: string;
  productNdc: string;
  lotNumber: string;
  memberId: number | null;
};

export type FamilyOption = { id: number; display_name: string };

type Props = {
  mode: "create" | "edit";
  initial?: MedicationFormValues;
  itemId?: number;
  familyOptions?: FamilyOption[];
};

const EMPTY: MedicationFormValues = {
  productName: "",
  manufacturer: "",
  productNdc: "",
  lotNumber: "",
  memberId: null,
};

export function MedicationForm({ mode, initial, itemId, familyOptions = [] }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<MedicationFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);

  function update<K extends keyof MedicationFormValues>(key: K, v: MedicationFormValues[K]) {
    setValues((cur) => ({ ...cur, [key]: v }));
  }

  function pickProduct(name: string) {
    setValues((cur) => ({
      ...cur,
      productName: name,
      // Reset manufacturer + NDC when the product changes — they no longer apply.
      manufacturer: cur.productName === name ? cur.manufacturer : "",
      productNdc: cur.productName === name ? cur.productNdc : "",
    }));
  }

  function pickManufacturer(m: ManufacturerSuggestion) {
    setValues((cur) => ({ ...cur, manufacturer: m.labelerName }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.productName.trim() || !values.manufacturer.trim()) {
      setError("Product name and manufacturer are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = mode === "create" ? "/api/cabinet" : `/api/cabinet/${itemId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName: values.productName.trim(),
          manufacturer: values.manufacturer.trim(),
          productNdc: values.productNdc.trim() || null,
          lotNumber: values.lotNumber.trim() || null,
          memberId: values.memberId,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        resource?: "meds" | "familyMembers";
        currentPlan?: "free" | "personal" | "family";
        limit?: number;
        upgradeTo?: "free" | "personal" | "family" | null;
      };
      if (res.status === 402 && json.error === "QUOTA_EXCEEDED" && json.resource && json.currentPlan && typeof json.limit === "number") {
        setQuotaError({
          resource: json.resource,
          currentPlan: json.currentPlan,
          limit: json.limit,
          upgradeTo: json.upgradeTo ?? null,
        });
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.push("/cabinet");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!itemId) return;
    if (!confirm("Remove this medication from your cabinet?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cabinet/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Delete failed");
      }
      router.push("/cabinet");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <>
    <form className="space-y-6" onSubmit={handleSubmit}>
      {familyOptions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">For</label>
          <select
            value={values.memberId ?? ""}
            onChange={(e) =>
              update("memberId", e.target.value ? Number.parseInt(e.target.value, 10) : null)
            }
            className="input bg-surface-container-low"
          >
            <option value="">Myself</option>
            {familyOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">
          Product name <span className="text-error">*</span>
        </label>
        <ProductTypeahead
          value={values.productName}
          onChange={(v) => update("productName", v)}
          onPick={pickProduct}
          placeholder="Start typing a drug name…"
        />
        <p className="text-label-sm text-on-surface-variant">
          Pick from the dropdown for the most accurate match.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">
          Manufacturer <span className="text-error">*</span>
          {values.productName ? (
            <span className="ml-2 text-label-sm font-normal opacity-70">
              showing makers of &ldquo;{values.productName}&rdquo;
            </span>
          ) : (
            <span className="ml-2 text-label-sm font-normal opacity-50">
              pick a product first
            </span>
          )}
        </label>
        <ManufacturerTypeahead
          value={values.manufacturer}
          onChange={(v) => update("manufacturer", v)}
          onPick={pickManufacturer}
          placeholder={
            values.productName ? "Click to see makers" : "Optional, pick a product first"
          }
          product={values.productName || undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant" htmlFor="ndc">
            NDC <span className="text-outline">(optional)</span>
          </label>
          <input
            id="ndc"
            type="text"
            className="input bg-surface-container-low font-mono"
            placeholder="0093-4155-01"
            value={values.productNdc}
            onChange={(e) => update("productNdc", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant" htmlFor="lot">
            Lot number <span className="text-outline">(optional)</span>
          </label>
          <input
            id="lot"
            type="text"
            className="input bg-surface-container-low font-mono"
            placeholder="AB1234"
            value={values.lotNumber}
            onChange={(e) => update("lotNumber", e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || submitting}
            className="btn-ghost text-error hover:bg-error-container hover:text-on-error-container"
          >
            {deleting ? "Removing…" : "Remove medication"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/cabinet")}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving…" : mode === "create" ? "Add to cabinet" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
    {quotaError ? (
      <UpgradeModal
        error={quotaError}
        onClose={() => setQuotaError(null)}
        onUpgraded={() => setQuotaError(null)}
      />
    ) : null}
    </>
  );
}

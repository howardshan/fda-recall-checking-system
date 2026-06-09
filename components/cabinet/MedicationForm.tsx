"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductTypeahead } from "@/components/ProductTypeahead";
import { ManufacturerTypeahead, type ManufacturerSuggestion } from "@/components/ManufacturerTypeahead";
import { UpgradeModal, type QuotaError } from "@/components/billing/UpgradeModal";
import { UnverifiedManufacturerModal } from "@/components/cabinet/UnverifiedManufacturerModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUnreadNotifications } from "@/components/notifications/UnreadNotificationsProvider";

export type MedicationFormValues = {
  productName: string;
  manufacturer: string;
  productNdc: string;
  lotNumber: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: MedicationFormValues;
  itemId?: number;
};

const EMPTY: MedicationFormValues = {
  productName: "",
  manufacturer: "",
  productNdc: "",
  lotNumber: "",
};

export function MedicationForm({ mode, initial, itemId }: Props) {
  const router = useRouter();
  const { scheduleUnreadRefreshAfterMatching, refreshUnreadCount } = useUnreadNotifications();
  const [values, setValues] = useState<MedicationFormValues>(initial ?? EMPTY);
  const [selectedProduct, setSelectedProduct] = useState(
    mode === "edit" && initial?.productName?.trim() ? initial.productName.trim() : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);
  const [unverifiedPrompt, setUnverifiedPrompt] = useState<{
    message: string;
  } | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  function update<K extends keyof MedicationFormValues>(key: K, v: MedicationFormValues[K]) {
    setValues((cur) => ({ ...cur, [key]: v }));
  }

  function pickProduct(name: string) {
    setSelectedProduct(name);
    setValues((cur) => ({
      ...cur,
      productName: name,
      // Reset manufacturer + NDC when the product changes — they no longer apply.
      manufacturer: cur.productName === name ? cur.manufacturer : "",
      productNdc: cur.productName === name ? cur.productNdc : "",
    }));
  }

  function changeProductName(name: string) {
    const diverged = Boolean(selectedProduct && name.trim() !== selectedProduct.trim());
    setValues((cur) => ({
      ...cur,
      productName: name,
      ...(diverged ? { manufacturer: "", productNdc: "" } : {}),
    }));
    if (!selectedProduct || name.trim() !== selectedProduct.trim()) {
      setSelectedProduct("");
    }
  }

  function pickManufacturer(m: ManufacturerSuggestion) {
    setValues((cur) => ({ ...cur, manufacturer: m.labelerName }));
  }

  async function submitMedication(confirmUnverified = false) {
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
          confirmUnverified,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        resource?: "meds";
        currentPlan?: "free" | "personal" | "family";
        limit?: number;
        upgradeTo?: "free" | "personal" | "family" | null;
      };
      if (res.status === 409 && json.error === "MANUFACTURER_UNVERIFIED") {
        setUnverifiedPrompt({
          message:
            json.message ??
            "This manufacturer is not in our FDA drug directory. We cannot monitor recalls for this entry.",
        });
        setSubmitting(false);
        return;
      }
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
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Save failed");
      scheduleUnreadRefreshAfterMatching();
      router.push("/cabinet");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.productName.trim() || !values.manufacturer.trim()) {
      setError("Product name and manufacturer are required.");
      return;
    }
    await submitMedication(false);
  }

  async function confirmRemoveMedication() {
    if (!itemId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Delete failed");
      }
      setRemoveConfirmOpen(false);
      void refreshUnreadCount();
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
      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">
          Product name <span className="text-error">*</span>
        </label>
        <ProductTypeahead
          value={values.productName}
          onChange={changeProductName}
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
          {selectedProduct ? (
            <span className="ml-2 text-label-sm font-normal opacity-70">
              showing makers of &ldquo;{selectedProduct}&rdquo;
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
            selectedProduct ? "Pick a common maker or type to search" : "Pick a product from the dropdown first"
          }
          product={selectedProduct || undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant" htmlFor="ndc">
            NDC <span className="text-on-surface-variant">(optional)</span>
          </label>
          <input
            id="ndc"
            type="text"
            className="input bg-surface-container-lowest font-mono"
            placeholder="0093-4155-01"
            value={values.productNdc}
            onChange={(e) => update("productNdc", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant" htmlFor="lot">
            Lot number <span className="text-on-surface-variant">(optional)</span>
          </label>
          <input
            id="lot"
            type="text"
            className="input bg-surface-container-lowest font-mono"
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
            onClick={() => setRemoveConfirmOpen(true)}
            disabled={deleting || submitting}
            className="btn-ghost text-error hover:bg-error-container hover:text-on-error-container"
          >
            Remove medication
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
    {unverifiedPrompt ? (
      <UnverifiedManufacturerModal
        message={unverifiedPrompt.message}
        medication={{
          productName: values.productName.trim(),
          manufacturer: values.manufacturer.trim(),
          productNdc: values.productNdc.trim() || null,
          lotNumber: values.lotNumber.trim() || null,
        }}
        busy={submitting}
        onCancel={() => setUnverifiedPrompt(null)}
        onConfirm={() => {
          setUnverifiedPrompt(null);
          void submitMedication(true);
        }}
      />
    ) : null}
    <ConfirmDialog
      open={removeConfirmOpen}
      title="Remove medication?"
      description="This will remove the entry from your cabinet and delete all recall alerts linked to it. This cannot be undone."
      confirmLabel="Remove medication"
      cancelLabel="Keep in cabinet"
      variant="danger"
      busy={deleting}
      onConfirm={() => void confirmRemoveMedication()}
      onCancel={() => {
        if (!deleting) setRemoveConfirmOpen(false);
      }}
      details={
        <div className="rounded-lg border border-primary/10 bg-surface-container-low p-4">
          <p className="text-label-md uppercase tracking-wider text-on-surface-variant">
            Removing
          </p>
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="text-label-sm text-on-surface-variant">Product name</dt>
              <dd className="mt-0.5 font-medium text-on-surface">
                {values.productName.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-label-sm text-on-surface-variant">Manufacturer</dt>
              <dd className="mt-0.5 font-medium text-on-surface">
                {values.manufacturer.trim() || "—"}
              </dd>
            </div>
            {values.productNdc.trim() ? (
              <div>
                <dt className="text-label-sm text-on-surface-variant">NDC</dt>
                <dd className="mt-0.5 font-mono text-body-md text-on-surface">
                  {values.productNdc.trim()}
                </dd>
              </div>
            ) : null}
            {values.lotNumber.trim() ? (
              <div>
                <dt className="text-label-sm text-on-surface-variant">Lot number</dt>
                <dd className="mt-0.5 font-mono text-body-md text-on-surface">
                  {values.lotNumber.trim()}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      }
    />
    </>
  );
}

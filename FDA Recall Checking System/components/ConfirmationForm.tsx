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
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        onSubmit(values);
      }}
    >
      <p className="text-sm text-slate-600">
        请检查或修正下方信息,确认后点击「查询召回」。
      </p>

      {candidates && candidates.length > 1 ? (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">候选识别结果</span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            onChange={(e) => applyCandidate(Number.parseInt(e.target.value, 10))}
            defaultValue=""
          >
            <option value="" disabled>
              选择以填充表单…
            </option>
            {candidates.map((c, i) => (
              <option key={i} value={i}>
                {(c.productName ?? "(无名称)") + " — " + (c.manufacturer ?? "(无厂商)")}
                {c.score != null ? ` (${c.score.toFixed(2)})` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">
          产品名称 <span className="text-rose-600">*</span>
        </span>
        <input
          type="text"
          autoFocus
          required
          value={values.productName}
          onChange={(e) => update("productName", e.target.value)}
          placeholder="例如:Amoxicillin"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">厂商</span>
        <input
          type="text"
          value={values.manufacturer}
          onChange={(e) => update("manufacturer", e.target.value)}
          placeholder="例如:Sandoz Inc"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">NDC(选填)</span>
          <input
            type="text"
            value={values.ndc}
            onChange={(e) => update("ndc", e.target.value)}
            placeholder="例如:0093-4155-01"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">批号(选填)</span>
          <input
            type="text"
            value={values.lotNumber}
            onChange={(e) => update("lotNumber", e.target.value)}
            placeholder="例如:AB1234"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono"
          />
        </label>
      </div>

      <p className="text-xs text-slate-500">
        提供 NDC 与批号可显著提高判定准确度。
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          ← 返回修改
        </button>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "查询中…" : "查询召回"}
        </button>
      </div>
    </form>
  );
}

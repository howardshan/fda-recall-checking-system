"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ManualInputTab } from "./ManualInputTab";
import { ConfirmationForm, type ConfirmationFormValues } from "./ConfirmationForm";
import { ResultPanel } from "./ResultPanel";
import { Disclaimer } from "./Disclaimer";
import type { CheckRecallResult } from "@/lib/check-recall";

const PhotoTab = dynamic(
  () => import("./PhotoTab").then((m) => m.PhotoTab),
  { ssr: false, loading: () => <div className="text-sm text-slate-500">加载中…</div> },
);

const BarcodeTab = dynamic(
  () => import("./BarcodeTab").then((m) => m.BarcodeTab),
  { ssr: false, loading: () => <div className="text-sm text-slate-500">加载中…</div> },
);

type Tab = "manual" | "photo" | "barcode";
type Stage = "input" | "confirm" | "result";

type CheckResponse = CheckRecallResult & { lastSyncedAt: string | null };

export function RecallChecker() {
  const [tab, setTab] = useState<Tab>("manual");
  const [stage, setStage] = useState<Stage>("input");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formInitial, setFormInitial] = useState<Partial<ConfirmationFormValues>>(
    {},
  );
  const [candidates, setCandidates] = useState<
    Array<{
      productName: string | null;
      manufacturer: string | null;
      ndc: string | null;
      score?: number;
    }>
  >([]);
  const [inputMethod, setInputMethod] = useState<Tab>("manual");
  const [result, setResult] = useState<CheckResponse | null>(null);

  function reset() {
    setStage("input");
    setFormInitial({});
    setCandidates([]);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(values: ConfirmationFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/check-recall?inputMethod=${inputMethod}`, {
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
        | { error: string };
      if (!res.ok) {
        throw new Error(("error" in json && json.error) || "查询失败");
      }
      setResult(json as CheckResponse);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "查询失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {stage === "input" ? (
        <>
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {(["manual", "photo", "barcode"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-1.5 transition ${
                  tab === t
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "manual" ? "手动输入" : t === "photo" ? "拍照" : "扫码"}
              </button>
            ))}
          </div>

          {tab === "manual" ? (
            <ManualInputTab
              onContinue={(v) => {
                setFormInitial(v);
                setCandidates([]);
                setInputMethod("manual");
                setStage("confirm");
              }}
            />
          ) : tab === "photo" ? (
            <PhotoTab
              onExtracted={(initial, cands) => {
                setFormInitial(initial);
                setCandidates(cands);
                setInputMethod("photo");
                setStage("confirm");
              }}
            />
          ) : (
            <BarcodeTab
              onExtracted={(initial, cands) => {
                setFormInitial(initial);
                setCandidates(cands);
                setInputMethod("barcode");
                setStage("confirm");
              }}
            />
          )}
        </>
      ) : stage === "confirm" ? (
        <>
          <ConfirmationForm
            initial={formInitial}
            candidates={candidates}
            submitting={submitting}
            onBack={() => setStage("input")}
            onSubmit={handleSubmit}
          />
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}
        </>
      ) : result ? (
        <ResultPanel result={result} onReset={reset} />
      ) : null}

      <Disclaimer />
    </div>
  );
}

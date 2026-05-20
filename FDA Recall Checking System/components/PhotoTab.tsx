"use client";

import { useEffect, useRef, useState } from "react";
import { compressImageToDataUrl, loadImage, preprocessForOcr } from "@/lib/image";

type ExtractedFields = {
  productName: string;
  manufacturer: string;
  ndc: string;
  lotNumber: string;
};

type Candidate = {
  productName: string | null;
  manufacturer: string | null;
  ndc: string | null;
  score?: number;
};

type Props = {
  onExtracted: (
    initial: ExtractedFields,
    candidates: Candidate[],
    rawOcr: string,
  ) => void;
};

type Photo = { id: number; previewUrl: string; file: File };
type OcrPart = { photoIdx: number; text: string };
type Phase = "idle" | "ocr" | "review" | "matching";

const MAX_PHOTOS = 5;

export function PhotoTab({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<{ current: number; total: number; pct: number }>(
    { current: 0, total: 0, pct: 0 },
  );
  const [ocrParts, setOcrParts] = useState<OcrPart[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd: Photo[] = [];
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      toAdd.push({
        id: Date.now() + i,
        previewUrl: URL.createObjectURL(file),
        file,
      });
    }
    setPhotos((curr) => [...curr, ...toAdd]);
    setError(null);
  }

  function removePhoto(id: number) {
    setPhotos((curr) => {
      const target = curr.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return curr.filter((p) => p.id !== id);
    });
  }

  function resetAll() {
    for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    setPhotos([]);
    setOcrParts([]);
    setPhase("idle");
    setError(null);
  }

  async function runOcr() {
    if (photos.length === 0) return;
    setError(null);
    setOcrParts([]);
    setPhase("ocr");
    setProgress({ current: 0, total: photos.length, pct: 0 });

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status?: string; progress?: number }) => {
          if (typeof m.progress === "number") {
            setProgress((p) => ({ ...p, pct: Math.round(m.progress! * 100) }));
          }
        },
      });

      const parts: OcrPart[] = [];
      try {
        for (let i = 0; i < photos.length; i++) {
          setProgress({ current: i + 1, total: photos.length, pct: 0 });
          const img = await loadImage(photos[i].file);
          const canvas = preprocessForOcr(img, 1600);
          const { data } = await worker.recognize(canvas);
          const text = (data.text ?? "").trim();
          parts.push({ photoIdx: i, text });
        }
      } finally {
        await worker.terminate();
      }

      const anyText = parts.some((p) => p.text.length > 0);
      if (!anyText) {
        setError("未从任何一张图片中识别到文字。试试更清晰的照片,或换用手动输入。");
        setPhase("idle");
        return;
      }

      setOcrParts(parts);
      setPhase("review");

      // TEMPORARY: fire-and-forget upload of compressed originals + OCR text
      // for offline debugging. No UI dependency — runs even if the user
      // bounces straight to "重新拍摄".
      void (async () => {
        try {
          const dataUrls = await Promise.all(
            photos.map((p) => compressImageToDataUrl(p.file, 1200, 0.55)),
          );
          await fetch("/api/log-photos", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ocrText: parts.map((p) => p.text).join("\n\n"),
              photos: dataUrls,
            }),
            // Keep alive so a quick navigation doesn't drop the request.
            keepalive: true,
          });
        } catch {
          // best-effort; ignore failures
        }
      })();
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR 失败,请重试");
      setPhase("idle");
    }
  }

  async function continueToMatch() {
    setError(null);
    setPhase("matching");
    try {
      const ocrText = ocrParts
        .map((p) => p.text)
        .filter((t) => t.length > 0)
        .join("\n\n");

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ocrText }),
      });
      const json = (await res.json()) as {
        productName?: string | null;
        manufacturer?: string | null;
        ndc?: string | null;
        lotNumber?: string | null;
        candidates?: Array<{
          brandName?: string | null;
          genericName?: string | null;
          labelerName?: string | null;
          productNdc?: string | null;
          combinedScore?: number;
        }>;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "匹配失败");

      if (!json.productName && !json.ndc) {
        setError(
          "识别到了文字,但在 NDC 字典里没有匹配到药品。建议核对上方文本是否含药品名,或确认拍的是厂商包装(不是药房分装瓶)。",
        );
        setPhase("review");
        return;
      }

      const initial: ExtractedFields = {
        productName: json.productName ?? "",
        manufacturer: json.manufacturer ?? "",
        ndc: json.ndc ?? "",
        lotNumber: json.lotNumber ?? "",
      };
      const candidates: Candidate[] = (json.candidates ?? []).map((c) => ({
        productName: c.brandName ?? c.genericName ?? null,
        manufacturer: c.labelerName ?? null,
        ndc: c.productNdc ?? null,
        score: c.combinedScore,
      }));

      const ocrText2 = ocrParts.map((p) => p.text).join("\n\n");
      onExtracted(initial, candidates, ocrText2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "匹配失败,请重试");
      setPhase("review");
    }
  }

  const busy = phase === "ocr" || phase === "matching";
  const canAdd = !busy && photos.length < MAX_PHOTOS && phase === "idle";
  const canRunOcr = phase === "idle" && photos.length > 0;
  const phaseLabel =
    phase === "ocr"
      ? `本地识别中… 第 ${progress.current}/${progress.total} 张 (${progress.pct}%)`
      : phase === "matching"
      ? "查找药品字典中…"
      : "";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        围绕<strong>厂商原始包装</strong>拍 1–5 张照片(不同角度覆盖瓶身或纸盒)。
        <strong>图片在本地识别,不会上传服务器。</strong>
      </p>

      <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
        请拍厂商包装(纸盒、原始瓶身的厂家标签)。
        药房分装瓶(Kroger / CVS / Walgreens 的橙色瓶)上的{" "}
        <code className="font-mono">RX#</code> 是处方号,不能用于召回查询。
      </div>

      {phase === "idle" || phase === "ocr" ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              handleAddFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canAdd}
            className="w-full rounded-md border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {photos.length === 0
              ? "+ 拍第 1 张照片"
              : photos.length >= MAX_PHOTOS
              ? `已拍满 ${MAX_PHOTOS} 张`
              : `+ 加一张(已拍 ${photos.length}/${MAX_PHOTOS})`}
          </button>

          {photos.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {photos.map((p, idx) => (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded border border-slate-200 bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt={`拍摄 ${idx + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {idx + 1}
                  </div>
                  {!busy ? (
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/80"
                      aria-label="移除"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={runOcr}
            disabled={!canRunOcr && phase !== "ocr"}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "ocr" ? phaseLabel : `识别文字 (${photos.length} 张)`}
          </button>

          {phase === "ocr" ? (
            <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-600">
              {phaseLabel}
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
              识别到的文字 — 请核对(逐张照片显示)
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {ocrParts.map((part) => (
                <div key={part.photoIdx} className="px-3 py-2">
                  <div className="mb-1 text-[11px] font-medium text-slate-500">
                    照片 {part.photoIdx + 1}
                  </div>
                  {part.text ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-slate-800">
                      {part.text}
                    </pre>
                  ) : (
                    <div className="text-xs italic text-slate-400">(未识别到文字)</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={continueToMatch}
              disabled={phase === "matching"}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "matching" ? phaseLabel : "文字看起来对 → 继续匹配"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              disabled={phase === "matching"}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              重新拍摄
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}

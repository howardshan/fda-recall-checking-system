"use client";

import { useEffect, useRef, useState } from "react";

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
    rawBarcode: string,
  ) => void;
};

export function BarcodeTab({ onExtracted }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<{ reset?: () => void; close?: () => void } | null>(
    null,
  );
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    return () => {
      readerRef.current?.reset?.();
    };
  }, []);

  async function startScan() {
    setError(null);
    setLastRaw(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader as unknown as {
        reset?: () => void;
        close?: () => void;
      };

      if (!videoRef.current) {
        throw new Error("video element not mounted");
      }

      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, _err, controls) => {
          if (!result) return;
          const text = result.getText();
          if (!text) return;
          controls.stop();
          setScanning(false);
          await handleBarcode(text);
        },
      );
    } catch (e) {
      setScanning(false);
      const msg = e instanceof Error ? e.message : "无法访问摄像头";
      setError(`扫码启动失败:${msg}`);
    }
  }

  function stopScan() {
    readerRef.current?.reset?.();
    setScanning(false);
  }

  async function handleBarcode(raw: string) {
    setLastRaw(raw);
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ barcodeRaw: raw }),
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
      if (!res.ok) throw new Error(json.error ?? "解析失败");

      // If we still don't have a recognized product, surface a friendly hint:
      // pharmacy-bottle barcodes encode an Rx number, not an NDC.
      if (!json.ndc && !json.productName) {
        setError(
          "未从条码中解析出 NDC。这可能是药房分装瓶上的处方号(不是 NDC)。请改用拍照或手动输入。",
        );
        setWorking(false);
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
      onExtracted(initial, candidates, raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        对准药品<strong>厂商包装</strong>上的条码(支持一维码与 GS1 DataMatrix)。
        视频流仅在本设备处理。
      </p>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full"
          playsInline
          muted
        />
      </div>

      <div className="flex gap-2">
        {!scanning ? (
          <button
            type="button"
            onClick={startScan}
            disabled={working}
            className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {working ? "解析中…" : "开始扫码"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScan}
            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            停止扫码
          </button>
        )}
      </div>

      {lastRaw ? (
        <div className="rounded-md bg-slate-100 p-3 text-xs">
          <div className="text-slate-500">已读取:</div>
          <div className="mt-1 break-all font-mono text-slate-800">{lastRaw}</div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ProductTypeahead } from "./ProductTypeahead";
import { ManufacturerTypeahead, type ManufacturerSuggestion } from "./ManufacturerTypeahead";

type Props = {
  onContinue: (values: {
    productName: string;
    manufacturer: string;
    ndc: string;
    lotNumber: string;
  }) => void;
};

export function ManualInputTab({ onContinue }: Props) {
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [ndc, setNdc] = useState("");
  const [lotNumber, setLotNumber] = useState("");

  function pickProduct(name: string) {
    // If the user picked a different product, clear the manufacturer — the
    // old labeler probably doesn't make this new drug. NDC also clears for
    // the same reason.
    if (productName.trim() !== name.trim()) {
      setManufacturer("");
      setNdc("");
    }
    setProductName(name);
  }

  function pickManufacturer(m: ManufacturerSuggestion) {
    setManufacturer(m.labelerName);
  }

  const canContinue = productName.trim().length > 0 || ndc.trim().length > 0;
  const productLocked = productName.trim().length > 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canContinue) return;
        onContinue({ productName, manufacturer, ndc, lotNumber });
      }}
    >
      <p className="text-sm text-slate-600">
        手动输入药品信息。键入产品名,从候选中选;然后在厂商字段聚焦,只会显示<strong>做这款药的厂商</strong>。
      </p>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">产品名称</span>
        <ProductTypeahead
          value={productName}
          onChange={setProductName}
          onPick={pickProduct}
          placeholder="键入药名(例:amoxicillin),从下拉选"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">
          厂商{" "}
          {productLocked ? (
            <span className="text-xs font-normal text-slate-500">
              — 仅显示做「{productName.trim()}」的厂商
            </span>
          ) : (
            <span className="text-xs font-normal text-slate-400">
              — 请先选产品
            </span>
          )}
        </span>
        <ManufacturerTypeahead
          value={manufacturer}
          onChange={setManufacturer}
          onPick={pickManufacturer}
          placeholder={
            productLocked ? "聚焦看候选,或键入筛选" : "可不填,或先填产品名"
          }
          product={productLocked ? productName : undefined}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">NDC(选填)</span>
          <input
            type="text"
            value={ndc}
            onChange={(e) => setNdc(e.target.value)}
            placeholder="0093-4155-01"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">批号(选填)</span>
          <input
            type="text"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="AB1234"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono"
          />
        </label>
      </div>

      <p className="text-xs text-slate-500">
        提供 NDC 或批号可进一步收窄查询。仅产品 + 厂商也能查。
      </p>

      <button
        type="submit"
        disabled={!canContinue}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        下一步:确认 →
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { ProductTypeahead } from "./ProductTypeahead";
import { ManufacturerTypeahead, type ManufacturerSuggestion } from "./ManufacturerTypeahead";

export type ManualInputValues = {
  productName: string;
  manufacturer: string;
  ndc: string;
  lotNumber: string;
};

type Props = {
  onSubmit: (values: ManualInputValues) => void | Promise<void>;
  submitting?: boolean;
};

export function ManualInputTab({ onSubmit, submitting }: Props) {
  const [productName, setProductName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [ndc, setNdc] = useState("");
  const [lotNumber, setLotNumber] = useState("");

  function pickProduct(name: string) {
    if (productName.trim() !== name.trim()) {
      setManufacturer("");
      setNdc("");
    }
    setSelectedProduct(name);
    setProductName(name);
  }

  function changeProductName(name: string) {
    const diverged = Boolean(selectedProduct && name.trim() !== selectedProduct.trim());
    setProductName(name);
    if (diverged) {
      setManufacturer("");
      setNdc("");
    }
    if (!selectedProduct || name.trim() !== selectedProduct.trim()) {
      setSelectedProduct("");
    }
  }

  function pickManufacturer(m: ManufacturerSuggestion) {
    setManufacturer(m.labelerName);
  }

  const canSubmit = productName.trim().length > 0 || ndc.trim().length > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        void onSubmit({ productName, manufacturer, ndc, lotNumber });
      }}
    >
      <p className="text-body-md text-on-surface-variant">
        Start typing the drug name and pick from the dropdown. The manufacturer
        field will then only show companies that make that drug.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">Product name</label>
        <ProductTypeahead
          value={productName}
          onChange={changeProductName}
          onPick={pickProduct}
          placeholder="e.g. amoxicillin"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-label-md text-on-surface-variant">
          Manufacturer
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
          value={manufacturer}
          onChange={setManufacturer}
          onPick={pickManufacturer}
          placeholder={selectedProduct ? "Pick a common maker or type to search" : "Pick a product from the dropdown first"}
          product={selectedProduct || undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="ndc" className="text-label-md text-on-surface-variant">
            NDC <span className="text-on-surface-variant">(optional)</span>
          </label>
          <input
            id="ndc"
            type="text"
            value={ndc}
            onChange={(e) => setNdc(e.target.value)}
            placeholder="0093-4155-01"
            className="input font-mono bg-surface-container-low"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="lot" className="text-label-md text-on-surface-variant">
            Lot number <span className="text-on-surface-variant">(optional)</span>
          </label>
          <input
            id="lot"
            type="text"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="AB1234"
            className="input font-mono bg-surface-container-low"
          />
        </div>
      </div>

      <p className="text-label-sm text-on-surface-variant">
        Providing NDC or lot number narrows the result. Product + manufacturer alone also works.
      </p>

      <button type="submit" disabled={!canSubmit || submitting} className="btn-primary w-full py-3">
        {submitting ? "Checking…" : "Check recall status"}
      </button>
    </form>
  );
}

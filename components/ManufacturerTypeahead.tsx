"use client";

import { useCallback } from "react";
import { Typeahead } from "./Typeahead";

export type ManufacturerSuggestion = {
  labelerName: string;
  score: number;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: ManufacturerSuggestion) => void;
  placeholder?: string;
  /**
   * If set, the typeahead restricts suggestions to labelers that make this
   * product. Setting it also lowers the minimum query length to 0 so the
   * full list of makers appears as soon as the field is focused.
   */
  product?: string;
};

export function ManufacturerTypeahead({
  value,
  onChange,
  onPick,
  placeholder,
  product,
}: Props) {
  const productKey = product?.trim() ?? "";
  const fetcher = useCallback(
    async (q: string, signal: AbortSignal) => {
      const params = new URLSearchParams({
        mode: "manufacturer",
        q,
        limit: "20",
      });
      if (productKey) params.set("product", productKey);
      const res = await fetch(`/api/suggest?${params.toString()}`, { signal });
      if (!res.ok) return [];
      const json = (await res.json()) as { results?: ManufacturerSuggestion[] };
      return json.results ?? [];
    },
    [productKey],
  );

  return (
    <Typeahead<ManufacturerSuggestion>
      value={value}
      onChange={onChange}
      onPick={onPick}
      fetcher={fetcher}
      itemKey={(m, i) => `${m.labelerName}-${i}`}
      renderItem={(m) => (
        <span className="font-medium text-on-surface">{m.labelerName}</span>
      )}
      placeholder={placeholder}
      minQueryLength={productKey ? 0 : 2}
      fetchOnlyWhenFocused={Boolean(productKey)}
    />
  );
}

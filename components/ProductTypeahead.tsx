"use client";

import { useCallback } from "react";
import { Typeahead } from "./Typeahead";

export type ProductSuggestion = { name: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (name: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function ProductTypeahead({
  value,
  onChange,
  onPick,
  placeholder,
  autoFocus,
}: Props) {
  const fetcher = useCallback(async (q: string, signal: AbortSignal) => {
    const res = await fetch(
      `/api/suggest?mode=product&q=${encodeURIComponent(q)}&limit=10`,
      { signal },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: ProductSuggestion[] };
    return json.results ?? [];
  }, []);

  return (
    <Typeahead<ProductSuggestion>
      value={value}
      onChange={onChange}
      onPick={(s) => onPick(s.name)}
      fetcher={fetcher}
      itemKey={(s, i) => `${s.name}-${i}`}
      renderItem={(s) => (
        <span className="font-medium text-on-surface">{s.name}</span>
      )}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";
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
   * When set, suggestions are limited to labelers that make this product.
   * The user types at least one letter to search — we do not load an
   * alphabetical slice of all makers on empty focus.
   */
  product?: string;
};

const CONSTRAINED_LIMIT = 50;
const CACHE_MAX = 64;

type CachedResult = {
  items: ManufacturerSuggestion[];
  truncated: boolean;
};

export function ManufacturerTypeahead({
  value,
  onChange,
  onPick,
  placeholder,
  product,
}: Props) {
  const productKey = product?.trim() ?? "";
  const constrained = Boolean(productKey);
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  useEffect(() => {
    cacheRef.current.clear();
  }, [productKey]);

  const fetcher = useCallback(
    async (q: string, signal: AbortSignal) => {
      const cacheKey = `${productKey.toLowerCase()}\0${q.toLowerCase()}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const params = new URLSearchParams({
        mode: "manufacturer",
        q,
        limit: String(constrained ? CONSTRAINED_LIMIT : 20),
      });
      if (productKey) params.set("product", productKey);
      const res = await fetch(`/api/suggest?${params.toString()}`, { signal });
      if (!res.ok) return { items: [], truncated: false };
      const json = (await res.json()) as {
        results?: ManufacturerSuggestion[];
        truncated?: boolean;
      };
      const result: CachedResult = {
        items: json.results ?? [],
        truncated: json.truncated ?? false,
      };

      if (cacheRef.current.size >= CACHE_MAX) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }
      cacheRef.current.set(cacheKey, result);
      return result;
    },
    [productKey, constrained],
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
      placeholder={
        placeholder ??
        (constrained
          ? "Type to search makers (e.g. Teva)"
          : "Start typing a manufacturer name…")
      }
      minQueryLength={constrained ? 1 : 2}
      debounceMs={constrained ? 100 : 250}
      fetchOnlyWhenFocused={constrained}
      emptyFocusHint={
        constrained ? (
          <>
            <p className="font-medium text-on-surface">Search by manufacturer name</p>
            <p className="mt-1">
              This product has many makers in our FDA directory. Type the first few
              letters — for example <span className="font-medium">Tev</span> for Teva
              or <span className="font-medium">Act</span> for Actavis — then pick from
              the list.
            </p>
          </>
        ) : undefined
      }
      truncatedFooter="More matches available — keep typing to narrow the list."
    />
  );
}

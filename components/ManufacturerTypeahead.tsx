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
  /** When set, suggestions are limited to labelers that make this product. */
  product?: string;
};

const CONSTRAINED_LIMIT = 50;
const COMMON_LIMIT = 12;
const CACHE_MAX = 64;

type CachedResult = {
  items: ManufacturerSuggestion[];
  truncated: boolean;
};

type SuggestResult = CachedResult & { error?: string };

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

  const fetchSuggest = useCallback(
    async (params: URLSearchParams, cacheKey: string, signal: AbortSignal): Promise<SuggestResult> => {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const res = await fetch(`/api/suggest?${params.toString()}`, { signal });
      const json = (await res.json()) as {
        results?: ManufacturerSuggestion[];
        truncated?: boolean;
        error?: string;
      };
      if (!res.ok) {
        return {
          items: [],
          truncated: false,
          error: json.error ?? "Request failed",
        };
      }
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
    [],
  );

  const emptyFocusFetcher = useCallback(
    async (signal: AbortSignal) => {
      if (!productKey) return { items: [], truncated: false };
      const cacheKey = `${productKey.toLowerCase()}\0__common__`;
      const params = new URLSearchParams({
        mode: "manufacturer",
        product: productKey,
        common: "1",
        limit: String(COMMON_LIMIT),
      });
      return fetchSuggest(params, cacheKey, signal);
    },
    [productKey, fetchSuggest],
  );

  const fetcher = useCallback(
    async (q: string, signal: AbortSignal) => {
      const cacheKey = `${productKey.toLowerCase()}\0${q.toLowerCase()}`;
      const params = new URLSearchParams({
        mode: "manufacturer",
        q,
        limit: String(constrained ? CONSTRAINED_LIMIT : 20),
      });
      if (productKey) params.set("product", productKey);
      return fetchSuggest(params, cacheKey, signal);
    },
    [productKey, constrained, fetchSuggest],
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
          ? "Pick a common maker or type to search"
          : "Start typing a manufacturer name…")
      }
      minQueryLength={constrained ? 1 : 2}
      debounceMs={constrained ? 100 : 250}
      fetchOnlyWhenFocused={constrained}
      emptyFocusFetcher={constrained ? emptyFocusFetcher : undefined}
      emptyFocusHeader={
        constrained ? `Common makers for “${productKey}”` : undefined
      }
      emptyFocusFooter={
        constrained
          ? "Type to search all makers — there may be more than shown above."
          : undefined
      }
      truncatedFooter="More matches available — keep typing to narrow the list."
      loadingMessage="Loading makers…"
      emptyFocusEmptyMessage="No common makers found for this product. Type to search by name."
      emptyFocusErrorMessage="Couldn't load common makers. Type to search by name."
      searchErrorMessage="Manufacturer search failed. Try again."
    />
  );
}

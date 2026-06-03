"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type TypeaheadFetchResult<T> = T[] | { items: T[]; truncated?: boolean };

function normalizeFetchResult<T>(result: TypeaheadFetchResult<T>): {
  items: T[];
  truncated: boolean;
} {
  if (Array.isArray(result)) {
    return { items: result, truncated: false };
  }
  return { items: result.items, truncated: result.truncated ?? false };
}

type Props<T> = {
  value: string;
  onChange: (v: string) => void;
  onPick: (item: T) => void;
  fetcher: (query: string, signal: AbortSignal) => Promise<TypeaheadFetchResult<T>>;
  renderItem: (item: T) => ReactNode;
  itemKey: (item: T, idx: number) => string;
  placeholder?: string;
  autoFocus?: boolean;
  minQueryLength?: number;
  debounceMs?: number;
  /** When true, skip fetching until the input is focused (manufacturer list mode). */
  fetchOnlyWhenFocused?: boolean;
  /** Shown on focus when the query is shorter than minQueryLength. */
  emptyFocusHint?: ReactNode;
  /** Footer when the API indicates more matches exist beyond the result cap. */
  truncatedFooter?: ReactNode;
  /** Shown in the dropdown while a fetch is in flight. */
  loadingMessage?: ReactNode;
};

export function Typeahead<T>({
  value,
  onChange,
  onPick,
  fetcher,
  renderItem,
  itemKey,
  placeholder,
  autoFocus,
  minQueryLength = 2,
  debounceMs = 250,
  fetchOnlyWhenFocused = false,
  emptyFocusHint,
  truncatedFooter,
  loadingMessage = "Searching…",
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const showHint =
    focused && emptyFocusHint != null && value.trim().length < minQueryLength;
  const showResultsPanel =
    focused &&
    !showHint &&
    value.trim().length >= minQueryLength &&
    (loading || items.length > 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Suppress one fetch cycle right after a pick — otherwise setting the
  // controlled `value` to the picked label immediately re-queries for it.
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (fetchOnlyWhenFocused && !focused) {
      return;
    }
    if (value.trim().length < minQueryLength) {
      setItems([]);
      setTruncated(false);
      setLoading(false);
      setOpen(focused && emptyFocusHint != null);
      return;
    }
    setOpen(focused);
    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const result = normalizeFetchResult(await fetcher(value.trim(), ctrl.signal));
        if (ctrl.signal.aborted) return;
        setItems(result.items);
        setTruncated(result.truncated);
        setOpen(focused && result.items.length > 0);
        setHighlighted(0);
      } catch {
        // abort or network error — ignore
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [value, fetcher, minQueryLength, debounceMs, fetchOnlyWhenFocused, focused, emptyFocusHint]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = useCallback(
    (item: T) => {
      skipNextRef.current = true;
      onPick(item);
      setOpen(false);
    },
    [onPick],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && !open && items.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(items[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          if (items.length > 0) {
            setOpen(true);
          } else if (emptyFocusHint && value.trim().length < minQueryLength) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              setFocused(false);
              setOpen(false);
            }
          }, 0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-9"
      />
      {loading ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          …
        </span>
      ) : null}
      {open && showHint ? (
        <div
          role="status"
          className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-on-surface-variant shadow-lg"
        >
          {emptyFocusHint}
        </div>
      ) : null}
      {open && showResultsPanel ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {loading && items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">{loadingMessage}</li>
          ) : null}
          {items.map((item, i) => (
            <li key={itemKey(item, i)}>
              <button
                type="button"
                onClick={() => pick(item)}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                  i === highlighted ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                }`}
              >
                {renderItem(item)}
              </button>
            </li>
          ))}
          {truncated && truncatedFooter ? (
            <li className="border-t border-slate-200 px-3 py-2 text-label-sm text-on-surface-variant">
              {truncatedFooter}
            </li>
          ) : null}
          {loading && items.length > 0 ? (
            <li className="border-t border-slate-200 px-3 py-1.5 text-label-sm text-on-surface-variant">
              {loadingMessage}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

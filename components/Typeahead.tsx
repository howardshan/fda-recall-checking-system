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
  /** Fetch suggestions shown on focus before the user types (e.g. common makers). */
  emptyFocusFetcher?: (signal: AbortSignal) => Promise<TypeaheadFetchResult<T>>;
  /** Header above the empty-focus suggestion list. */
  emptyFocusHeader?: ReactNode;
  /** Footer below the empty-focus suggestion list. */
  emptyFocusFooter?: ReactNode;
  /** Shown on focus when no emptyFocusFetcher and query is below minQueryLength. */
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
  emptyFocusFetcher,
  emptyFocusHeader,
  emptyFocusFooter,
  emptyFocusHint,
  truncatedFooter,
  loadingMessage = "Searching…",
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [previewItems, setPreviewItems] = useState<T[]>([]);
  const [previewTruncated, setPreviewTruncated] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAttempted, setPreviewAttempted] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const skipNextRef = useRef(false);

  const queryTooShort = value.trim().length < minQueryLength;
  const showHint =
    focused && queryTooShort && emptyFocusFetcher == null && emptyFocusHint != null;
  const showPreviewPanel =
    focused &&
    queryTooShort &&
    emptyFocusFetcher != null &&
    (previewLoading || previewAttempted);
  const showSearchPanel =
    focused && !queryTooShort && (loading || items.length > 0);
  const activeItems = showSearchPanel ? items : previewItems;
  const activeLoading = showSearchPanel ? loading : previewLoading;
  const activeTruncated = showSearchPanel ? truncated : previewTruncated;
  const activeFooter = showSearchPanel ? truncatedFooter : emptyFocusFooter;

  useEffect(() => {
    if (!emptyFocusFetcher || !focused || !queryTooShort) {
      if (!queryTooShort) {
        setPreviewItems([]);
        setPreviewTruncated(false);
        setPreviewLoading(false);
        setPreviewAttempted(false);
      }
      return;
    }

    previewAbortRef.current?.abort();
    const ctrl = new AbortController();
    previewAbortRef.current = ctrl;
    setPreviewLoading(true);
    setPreviewAttempted(false);
    setOpen(true);

    void (async () => {
      try {
        const result = normalizeFetchResult(await emptyFocusFetcher(ctrl.signal));
        if (ctrl.signal.aborted) return;
        setPreviewItems(result.items);
        setPreviewTruncated(result.truncated);
        setHighlighted(0);
      } catch {
        // abort or network error — ignore
      } finally {
        if (!ctrl.signal.aborted) {
          setPreviewLoading(false);
          setPreviewAttempted(true);
        }
      }
    })();

    return () => ctrl.abort();
  }, [emptyFocusFetcher, focused, queryTooShort]);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (fetchOnlyWhenFocused && !focused) {
      return;
    }
    if (queryTooShort) {
      setItems([]);
      setTruncated(false);
      setLoading(false);
      if (!emptyFocusFetcher) {
        setOpen(focused && emptyFocusHint != null);
      }
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
  }, [
    value,
    fetcher,
    minQueryLength,
    debounceMs,
    fetchOnlyWhenFocused,
    focused,
    emptyFocusHint,
    emptyFocusFetcher,
    queryTooShort,
  ]);

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
    const list = showSearchPanel ? items : showPreviewPanel ? previewItems : [];
    if (e.key === "ArrowDown" && !open && list.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open || list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(list[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function openOnFocus() {
    setFocused(true);
    if (!queryTooShort && items.length > 0) {
      setOpen(true);
    } else if (queryTooShort && emptyFocusFetcher) {
      setOpen(true);
    } else if (queryTooShort && emptyFocusHint) {
      setOpen(true);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={openOnFocus}
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
      {activeLoading ? (
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
      {open && (showPreviewPanel || showSearchPanel) ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {showPreviewPanel && emptyFocusHeader ? (
            <li className="border-b border-slate-200 px-3 py-2 text-label-sm font-semibold text-on-surface-variant">
              {emptyFocusHeader}
            </li>
          ) : null}
          {activeLoading && activeItems.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">{loadingMessage}</li>
          ) : null}
          {!activeLoading && showPreviewPanel && activeItems.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">
              No common makers found for this product. Type to search by name.
            </li>
          ) : null}
          {activeItems.map((item, i) => (
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
          {activeTruncated && activeFooter ? (
            <li className="border-t border-slate-200 px-3 py-2 text-label-sm text-on-surface-variant">
              {activeFooter}
            </li>
          ) : null}
          {activeLoading && activeItems.length > 0 ? (
            <li className="border-t border-slate-200 px-3 py-1.5 text-label-sm text-on-surface-variant">
              {loadingMessage}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

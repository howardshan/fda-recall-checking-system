"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Row = {
  id: number;
  recall_number: string;
  recalling_firm: string | null;
  brand_name: string | null;
  generic_name: string | null;
  reason_for_recall: string | null;
  classification: string | null;
  status: string | null;
  recall_initiation_date: string | null;
};

type Page = {
  items: Row[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function classChip(c: string | null): string {
  if (!c) return "chip bg-surface-container-high text-on-surface";
  if (/class\s*iii\b/i.test(c)) return "chip chip-iii";
  if (/class\s*ii\b/i.test(c)) return "chip chip-ii";
  if (/class\s*i\b/i.test(c)) return "chip chip-i";
  return "chip bg-surface-container-high text-on-surface";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function RecallBrowser() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [cls, setCls] = useState(sp.get("class") ?? "");
  const [since, setSince] = useState(sp.get("since") ?? "");
  const [until, setUntil] = useState(sp.get("until") ?? "");
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const queryString = sp.toString();

  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep filter inputs aligned with the URL (back/forward, shared links).
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setCls(sp.get("class") ?? "");
    setSince(sp.get("since") ?? "");
    setUntil(sp.get("until") ?? "");
  }, [queryString, sp]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(queryString);
    if (!params.has("page")) params.set("page", "1");
    setLoading(true);
    setError(null);
    fetch(`/api/recalls?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "Search failed");
        }
        return res.json();
      })
      .then((j) => {
        if (!cancelled) setData(j as Page);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cls) params.set("class", cls);
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    params.set("page", "1");
    router.push(`/recalls?${params.toString()}`);
  }

  function go(p: number) {
    const params = new URLSearchParams(sp);
    params.set("page", String(p));
    router.push(`/recalls?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <form
        className="card grid grid-cols-1 gap-4 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-label-md text-on-surface-variant">Search</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Drug name, manufacturer, reason…"
            className="input bg-surface-container-lowest"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">Class</label>
          <select
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            className="input bg-surface-container-lowest"
          >
            <option value="">All classes</option>
            <option value="I">Class I — Serious</option>
            <option value="II">Class II — Moderate</option>
            <option value="III">Class III — Low</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">From</label>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="input bg-surface-container-lowest"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">To</label>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="input bg-surface-container-lowest"
          />
        </div>
        <div className="md:col-span-5 flex justify-end">
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
        </div>
      </form>

      {/* Results */}
      {error ? (
        <div className="card border-error/30 bg-error-container text-on-error-container">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card py-16 text-center text-body-md text-on-surface-variant">
          Loading…
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card py-16 text-center text-body-md text-on-surface-variant">
          No recalls match these filters.
        </div>
      ) : (
        <>
          <p className="text-label-md text-on-surface-variant">
            Showing {data.items.length} of {data.total.toLocaleString()} recalls
            {data.totalPages > 1 ? ` · page ${data.page} / ${data.totalPages}` : ""}
          </p>
          <ul className="space-y-3">
            {data.items.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/recalls/${encodeURIComponent(r.recall_number)}`}
                  className="card block transition hover:bg-surface-container-low"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={classChip(r.classification)}>
                      {r.classification ?? "Unclassified"}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      {formatDate(r.recall_initiation_date)} · #{r.recall_number}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-headline-sm text-on-surface">
                    {r.brand_name || r.generic_name || "(unnamed)"}
                  </h3>
                  <p className="text-body-md text-on-surface-variant">
                    {r.recalling_firm}
                  </p>
                  {r.reason_for_recall ? (
                    <p className="mt-2 line-clamp-2 text-body-md">
                      {r.reason_for_recall}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-primary/10 pt-4">
              <button
                type="button"
                onClick={() => go(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn-secondary"
              >
                ← Previous
              </button>
              <span className="text-label-md text-on-surface-variant">
                Page {page} of {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => go(Math.min(data.totalPages, page + 1))}
                disabled={page >= data.totalPages}
                className="btn-secondary"
              >
                Next →
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

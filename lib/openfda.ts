const OPENFDA_BASE = "https://api.fda.gov";
const DOWNLOAD_INDEX = "https://api.fda.gov/download.json";

export type OpenFdaSearchResponse<T> = {
  meta?: {
    results?: { skip: number; limit: number; total: number };
  };
  results?: T[];
};

/**
 * Build a search URL for an OpenFDA endpoint.
 * `endpoint` is the path like "/drug/enforcement.json".
 */
function searchUrl(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${OPENFDA_BASE}${endpoint}`);
  const apiKey = process.env.OPENFDA_API_KEY;
  if (apiKey) url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Page through an OpenFDA search endpoint.
 * Yields one batch of results per call to the caller via the callback,
 * so the caller can process incrementally without holding all in memory.
 */
export async function paginateSearch<T>(
  endpoint: string,
  search: string,
  onBatch: (batch: T[]) => Promise<void>,
  opts: { limit?: number; maxRecords?: number } = {},
): Promise<{ totalFetched: number; reportedTotal: number | null }> {
  const limit = opts.limit ?? 100;
  let skip = 0;
  let totalFetched = 0;
  let reportedTotal: number | null = null;

  while (true) {
    const url = searchUrl(endpoint, { search, limit, skip });
    const res = await fetch(url);
    if (res.status === 404) {
      // OpenFDA returns 404 for "no results" — treat as done.
      break;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenFDA ${endpoint} ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as OpenFdaSearchResponse<T>;
    if (reportedTotal == null && json.meta?.results?.total != null) {
      reportedTotal = json.meta.results.total;
    }
    const batch = json.results ?? [];
    if (batch.length === 0) break;
    await onBatch(batch);
    totalFetched += batch.length;
    if (opts.maxRecords && totalFetched >= opts.maxRecords) break;
    if (batch.length < limit) break;
    skip += limit;
    // OpenFDA pagination caps skip at 25,000 for non-authenticated; with API key still has limits.
    if (skip >= 25000) break;
  }

  return { totalFetched, reportedTotal };
}

export type DownloadPartition = {
  file: string;
  size_mb?: string | number;
  records?: string | number;
  display_name?: string;
};

export type DownloadIndex = {
  results: {
    drug?: {
      enforcement?: { partitions?: DownloadPartition[] };
      ndc?: { partitions?: DownloadPartition[] };
    };
  };
};

export async function fetchDownloadIndex(): Promise<DownloadIndex> {
  const res = await fetch(DOWNLOAD_INDEX);
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenFDA download index: ${res.status}`);
  }
  return (await res.json()) as DownloadIndex;
}

/**
 * Build a date-range search clause for incremental sync.
 * `sinceDate` and `untilDate` are ISO "YYYY-MM-DD" strings.
 *
 * Use spaced ` TO ` (not `+TO+`): URLSearchParams encodes `+` as `%2B`, which
 * OpenFDA's parser treats as literal plus and fails with parse_exception.
 * Spaces become `+` in the query string, which OpenFDA decodes as ` TO `.
 */
export function dateRangeClause(
  field: string,
  sinceDate: string,
  untilDate: string,
): string {
  const since = sinceDate.replace(/-/g, "");
  const until = untilDate.replace(/-/g, "");
  return `${field}:[${since} TO ${until}]`;
}

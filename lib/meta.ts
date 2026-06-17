import { getServerSupabase } from "./supabase";

export type Meta = {
  recallCount: number;
  ndcCount: number;
  lastSyncedAt: string | null;
  lastSyncSource: string | null;
};

/**
 * Load homepage / dashboard meta counters directly via the service-role client.
 * Use this from Server Components instead of self-fetching /api/meta — the HTTP
 * round-trip adds 100–500 ms in dev mode for no benefit.
 */
export async function getMeta(): Promise<Meta> {
  try {
    const supabase = getServerSupabase();
    const [recallCountRes, ndcCountRes, lastSyncRes] = await Promise.all([
      supabase.from("recalls").select("*", { count: "exact", head: true }),
      supabase.from("ndc_products").select("*", { count: "exact", head: true }),
      supabase
        .from("sync_runs")
        .select("finished_at,status,source")
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(1),
    ]);
    return {
      recallCount: recallCountRes.count ?? 0,
      ndcCount: ndcCountRes.count ?? 0,
      lastSyncedAt: lastSyncRes.data?.[0]?.finished_at ?? null,
      lastSyncSource: lastSyncRes.data?.[0]?.source ?? null,
    };
  } catch {
    return {
      recallCount: 0,
      ndcCount: 0,
      lastSyncedAt: null,
      lastSyncSource: null,
    };
  }
}

/** Ops banner for dashboard — uses service role (sync_runs has RLS, no client policies). */
export async function getStaleSyncWarning(): Promise<string | null> {
  const meta = await getMeta();
  const last = meta.lastSyncedAt;
  if (!last) {
    return "Recall data has never been synced. Alerts will not fire until the first sync runs.";
  }
  const hoursAgo = (Date.now() - new Date(last).getTime()) / 1000 / 60 / 60;
  if (hoursAgo > 48) {
    const when = new Date(last).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `Last updated ${when} — that's longer than expected. Alerts may be delayed.`;
  }
  return null;
}

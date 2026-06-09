import { dateRangeClause, paginateSearch } from "./openfda";
import { normalizeEnforcementRecord, upsertRecallsChunked } from "./recalls";
import { scanAllActiveItems } from "./matching";
import { sendDigests, type DigestStats } from "./daily-digest";
import { dispatchPendingEmails } from "./notification-dispatcher";
import { sendEmailQuietly } from "./mailer";
import { getServerSupabase } from "./supabase";
import type { OpenFdaEnforcementRecord, RecallRow } from "./types";

export type SyncResult = {
  ok: true;
  lookbackDays: number;
  since: string;
  until: string;
  reportedTotal: number | null;
  fetched: number;
  normalized: number;
  upserted: number;
  matching: { scanned: number; newNotifications: number };
  dispatch: {
    considered: number;
    emailsSent: number;
    skipped: number;
    failed: number;
  };
  digest: DigestStats;
  runId: number;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function notifyOpsOfFailure(reason: string): Promise<void> {
  const to = process.env.OPS_ALERT_EMAIL;
  if (!to) return;
  await sendEmailQuietly({
    to,
    subject: "[FDA-NOTIF] Sync failed",
    html: `<p>FDA recall sync failed at ${new Date().toISOString()}:</p><pre>${reason}</pre>`,
    text: `FDA recall sync failed at ${new Date().toISOString()}:\n${reason}`,
  });
}

/**
 * Run an incremental sync of recall records from OpenFDA, then trigger
 * matching against all active cabinet items and dispatch any pending
 * notification emails. Failure to sync is logged to OPS_ALERT_EMAIL.
 *
 * Called from:
 *   - /api/sync           (Vercel Cron, CRON_SECRET-protected)
 *   - /api/admin/sync/trigger  (admin manual trigger, requireAdmin)
 */
export async function runSync(lookbackDays: number): Promise<SyncResult> {
  const supabase = getServerSupabase();

  const { data: started, error: startedErr } = await supabase
    .from("sync_runs")
    .insert({ source: "enforcement-incremental", status: "running" })
    .select("id")
    .single();
  if (startedErr) {
    throw new Error(`could not write sync_runs start: ${startedErr.message}`);
  }
  const runId = started.id as number;

  try {
    const until = new Date();
    const since = new Date(until.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const search = dateRangeClause(
      "recall_initiation_date",
      isoDate(since),
      isoDate(until),
    );

    let totalUpserted = 0;
    let totalNormalized = 0;

    const result = await paginateSearch<OpenFdaEnforcementRecord>(
      "/drug/enforcement.json",
      search,
      async (batch) => {
        const rows: RecallRow[] = [];
        for (const r of batch) {
          const row = normalizeEnforcementRecord(r);
          if (row) rows.push(row);
        }
        totalNormalized += rows.length;
        const n = await upsertRecallsChunked(supabase, rows, 500);
        totalUpserted += n;
      },
      { limit: 100 },
    );

    const matchResult = await scanAllActiveItems(supabase).catch((e) => {
      console.error("[sync] matching scan failed:", e);
      return { scanned: 0, newNotifications: 0 };
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

    const dispatchResult = await dispatchPendingEmails(supabase, appUrl).catch((e) => {
      console.error("[sync] instant dispatch failed:", e);
      return { considered: 0, emailsSent: 0, skipped: 0, failed: 0 };
    });

    const digestResult = await sendDigests(supabase, appUrl, "daily").catch((e) => {
      console.error("[sync] daily digest failed:", e);
      return { usersConsidered: 0, emailsSent: 0, skipped: 0, failed: 0 };
    });

    await supabase
      .from("sync_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        records_upserted: totalUpserted,
      })
      .eq("id", runId);

    return {
      ok: true,
      lookbackDays,
      since: isoDate(since),
      until: isoDate(until),
      reportedTotal: result.reportedTotal,
      fetched: result.totalFetched,
      normalized: totalNormalized,
      upserted: totalUpserted,
      matching: matchResult,
      dispatch: dispatchResult,
      digest: digestResult,
      runId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error: message,
      })
      .eq("id", runId);
    void notifyOpsOfFailure(message);
    throw err;
  }
}

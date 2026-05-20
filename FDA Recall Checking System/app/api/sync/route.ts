import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { dateRangeClause, paginateSearch } from "@/lib/openfda";
import {
  normalizeEnforcementRecord,
  upsertRecallsChunked,
} from "@/lib/recalls";
import type {
  OpenFdaEnforcementRecord,
  RecallRow,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_LOOKBACK_DAYS = 30;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function runSync(lookbackDays: number) {
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
    throw err;
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const lookbackParam = url.searchParams.get("lookbackDays");
  const lookbackDays = lookbackParam
    ? Math.max(1, Math.min(365, Number.parseInt(lookbackParam, 10) || DEFAULT_LOOKBACK_DAYS))
    : DEFAULT_LOOKBACK_DAYS;
  try {
    const result = await runSync(lookbackDays);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron sends GET. Accept both verbs.
export async function GET(req: Request) {
  return POST(req);
}

import { NextResponse } from "next/server";
import { sendDigests } from "@/lib/daily-digest";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron only — sends the weekly digest to FREE users.
// (Daily cron at /api/sync handles paid users + the actual OpenFDA pull.)
//
// The OpenFDA recall data + matching scan happens daily via /api/sync, which
// runs for all users regardless of plan. Notifications accumulate in the DB
// for free users with email_sent_at = null; this weekly endpoint just bundles
// them and emails the digest once a week.

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  // sync_runs row for observability (mirrors the daily sync pattern)
  const { data: started } = await supabase
    .from("sync_runs")
    .insert({ source: "digest-weekly", status: "running" })
    .select("id")
    .single();
  const runId = started?.id as number | undefined;

  try {
    const digest = await sendDigests(supabase, appUrl, "weekly");
    if (runId != null) {
      await supabase
        .from("sync_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          records_upserted: digest.emailsSent,
        })
        .eq("id", runId);
    }
    return NextResponse.json({ ok: true, runId, digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId != null) {
      await supabase
        .from("sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error: message,
        })
        .eq("id", runId);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel Cron sends GET. Accept both verbs.
export async function GET(req: Request) {
  return handle(req);
}

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

    return NextResponse.json({
      recallCount: recallCountRes.count ?? 0,
      ndcCount: ndcCountRes.count ?? 0,
      lastSyncedAt: lastSyncRes.data?.[0]?.finished_at ?? null,
      lastSyncSource: lastSyncRes.data?.[0]?.source ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        recallCount: 0,
        ndcCount: 0,
        lastSyncedAt: null,
        error: message,
      },
      { status: 200 },
    );
  }
}

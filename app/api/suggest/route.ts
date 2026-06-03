import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const mode = (url.searchParams.get("mode") ?? "product") as
    | "product"
    | "manufacturer";
  const product = (url.searchParams.get("product") ?? "").trim();
  const common = url.searchParams.get("common") === "1";
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "8", 10) || 8;
  const limit =
    mode === "manufacturer" && product.trim()
      ? common
        ? Math.min(20, Math.max(1, limitParam))
        : Math.min(50, Math.max(1, limitParam))
      : Math.min(20, Math.max(1, limitParam));

  try {
    const supabase = getServerSupabase();

    if (mode === "product") {
      if (q.length < 2) return NextResponse.json({ results: [] });
      const { data, error } = await supabase.rpc("product_name_suggest", {
        query: q,
        max_results: limit,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const results = ((data ?? []) as { name: string }[]).map((r) => ({
        name: r.name,
      }));
      return NextResponse.json({ results });
    }

    // mode === "manufacturer"
    if (product) {
      if (common) {
        if (q.length > 0) {
          return NextResponse.json({ results: [], truncated: false });
        }
        const { data, error } = await supabase.rpc("common_labelers_for_product", {
          product_name: product,
          max_results: limit,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const results = ((data ?? []) as { labeler_name: string }[]).map((r) => ({
          labelerName: r.labeler_name,
          score: 1,
        }));
        return NextResponse.json({
          results,
          truncated: true,
          preview: true,
        });
      }

      const { data, error } = await supabase.rpc("labelers_for_product", {
        product_name: product,
        query: q,
        max_results: limit,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const results = ((data ?? []) as { labeler_name: string }[]).map((r) => ({
        labelerName: r.labeler_name,
        score: 1,
      }));
      return NextResponse.json({
        results,
        truncated: results.length >= limit,
      });
    }

    // Unconstrained legacy path — used when no product is set yet.
    if (q.length < 2) return NextResponse.json({ results: [] });
    const { data, error } = await supabase.rpc("ndc_fuzzy_search", {
      query: q,
      threshold: 0.4,
      max_results: 50,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    type FuzzyRow = { labeler_name: string | null; labeler_score: number };
    const best = new Map<string, number>();
    for (const r of (data ?? []) as FuzzyRow[]) {
      if (!r.labeler_name) continue;
      if (r.labeler_score < 0.4) continue;
      const prev = best.get(r.labeler_name) ?? 0;
      if (r.labeler_score > prev) best.set(r.labeler_name, r.labeler_score);
    }
    const results = Array.from(best, ([labelerName, score]) => ({
      labelerName,
      score,
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

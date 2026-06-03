import { NextResponse } from "next/server";
import { applyRecallClassFilter } from "@/lib/recall-classification";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const cls = (url.searchParams.get("class") ?? "").trim(); // "I" / "II" / "III"
  const since = url.searchParams.get("since"); // YYYY-MM-DD
  const until = url.searchParams.get("until"); // YYYY-MM-DD
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(5, Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20),
  );

  const supabase = getServerSupabase();
  let query = supabase
    .from("recalls")
    .select(
      "id, recall_number, recalling_firm, product_description, brand_name, generic_name, manufacturer_name, reason_for_recall, classification, status, recall_initiation_date",
      { count: "exact" },
    )
    .order("recall_initiation_date", { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (cls === "I" || cls === "II" || cls === "III") {
    query = applyRecallClassFilter(query, cls);
  }

  if (since) query = query.gte("recall_initiation_date", since);
  if (until) query = query.lte("recall_initiation_date", until);

  if (q.length >= 2) {
    const pattern = `%${q}%`;
    query = query.or(
      `brand_name.ilike.${pattern},generic_name.ilike.${pattern},recalling_firm.ilike.${pattern},reason_for_recall.ilike.${pattern},product_description.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  });
}

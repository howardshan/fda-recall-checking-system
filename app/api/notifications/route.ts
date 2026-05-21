import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filter = (url.searchParams.get("status") ?? "all") as
    | "all"
    | "unread"
    | "read"
    | "dismissed";

  const supabase = await getServerAuthSupabase();
  let q = supabase
    .from("notifications")
    .select(
      `
      id, classification, status, created_at, email_sent_at,
      medication_items(id, product_name, manufacturer),
      recalls(recall_number, reason_for_recall, recall_initiation_date, classification, recalling_firm)
      `,
    )
    .order("created_at", { ascending: false });

  if (filter !== "all") q = q.eq("status", filter);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

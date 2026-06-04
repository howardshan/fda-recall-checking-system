import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerAuthSupabase();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

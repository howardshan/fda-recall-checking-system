import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { enforceFamilyQuota, QuotaExceededError } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .select("id, display_name, relationship, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ members: data ?? [] });
}

type CreateBody = { displayName?: string; relationship?: string | null };

export async function POST(req: Request) {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = body.displayName?.trim();
  if (!name) {
    return NextResponse.json({ error: "displayName required" }, { status: 400 });
  }

  try {
    await enforceFamilyQuota(supabase, userData.user.id);
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      return NextResponse.json(e.toJson(), { status: 402 });
    }
    throw e;
  }

  const { data, error } = await supabase
    .from("family_members")
    .insert({
      user_id: userData.user.id,
      display_name: name,
      relationship: body.relationship?.trim() || null,
    })
    .select("id, display_name, relationship, created_at")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }
  return NextResponse.json({ member: data }, { status: 201 });
}

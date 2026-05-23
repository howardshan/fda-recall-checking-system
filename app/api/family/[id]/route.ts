import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type PatchBody = { displayName?: string; relationship?: string | null };

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.displayName === "string") patch.display_name = body.displayName.trim();
  if (body.relationship !== undefined) patch.relationship = body.relationship?.trim() || null;

  const supabase = await getServerAuthSupabase();
  const { error } = await supabase.from("family_members").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = await getServerAuthSupabase();
  // Cascade is set up at the table level; deleting a family_member cascades
  // to its medication_items (per FK on delete cascade).
  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type UpdateBody = {
  productName?: string;
  manufacturer?: string;
  productNdc?: string | null;
  lotNumber?: string | null;
  memberId?: number | null;
  status?: "active" | "paused" | "deleted";
};

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase
    .from("medication_items")
    .select("id, product_name, manufacturer, product_ndc, lot_number, status")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: data });
}

export async function PATCH(req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.productName === "string") patch.product_name = body.productName.trim();
  if (typeof body.manufacturer === "string") patch.manufacturer = body.manufacturer.trim();
  if (body.productNdc !== undefined) patch.product_ndc = body.productNdc?.trim() || null;
  if (body.lotNumber !== undefined) patch.lot_number = body.lotNumber?.trim() || null;
  if (body.memberId !== undefined) patch.member_id = body.memberId;
  if (body.status) patch.status = body.status;
  patch.updated_at = new Date().toISOString();

  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase
    .from("medication_items")
    .update(patch)
    .eq("id", id)
    .select("id, product_name, manufacturer, product_ndc, lot_number, status")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  // Soft delete — keep the row so existing notifications keep their FK target.
  const supabase = await getServerAuthSupabase();
  const { error } = await supabase
    .from("medication_items")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

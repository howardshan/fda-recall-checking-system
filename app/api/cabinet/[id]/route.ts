import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { isManufacturerKnown } from "@/lib/manufacturer-verify";
import { notifyMatchesForItem, type CabinetItem } from "@/lib/matching";
import { dispatchAfterMatch } from "@/lib/dispatch-after-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type UpdateBody = {
  productName?: string;
  manufacturer?: string;
  productNdc?: string | null;
  lotNumber?: string | null;
  status?: "active" | "paused" | "deleted";
  confirmUnverified?: boolean;
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
    .select(
      "id, product_name, manufacturer, product_ndc, lot_number, status, manufacturer_unverified",
    )
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

  const supabase = await getServerAuthSupabase();
  const { data: existing } = await supabase
    .from("medication_items")
    .select("product_name, manufacturer")
    .eq("id", id)
    .maybeSingle();

  const patch: Record<string, unknown> = {};
  if (typeof body.productName === "string") patch.product_name = body.productName.trim();
  if (typeof body.manufacturer === "string") patch.manufacturer = body.manufacturer.trim();
  if (body.productNdc !== undefined) patch.product_ndc = body.productNdc?.trim() || null;
  if (body.lotNumber !== undefined) patch.lot_number = body.lotNumber?.trim() || null;
  if (body.status) patch.status = body.status;

  const nextProduct =
    (patch.product_name as string | undefined) ?? existing?.product_name ?? "";
  const nextManufacturer =
    (patch.manufacturer as string | undefined) ?? existing?.manufacturer ?? "";

  if (
    (typeof body.productName === "string" || typeof body.manufacturer === "string") &&
    nextProduct &&
    nextManufacturer
  ) {
    const admin = getServerSupabase();
    const known = await isManufacturerKnown(admin, nextProduct, nextManufacturer);
    patch.manufacturer_unverified = !known;
    if (!known && !body.confirmUnverified) {
      return NextResponse.json(
        {
          error: "MANUFACTURER_UNVERIFIED",
          message:
            "This manufacturer is not in our FDA drug directory. We cannot monitor recalls for this entry.",
          manufacturerUnverified: true,
        },
        { status: 409 },
      );
    }
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("medication_items")
    .update(patch)
    .eq("id", id)
    .select(
      "id, user_id, product_name, manufacturer, product_ndc, lot_number, status, manufacturer_unverified, expected_stop_date",
    )
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  if (
    !data.manufacturer_unverified &&
    data.status === "active" &&
    (typeof body.productName === "string" ||
      typeof body.manufacturer === "string" ||
      body.productNdc !== undefined ||
      body.lotNumber !== undefined)
  ) {
    const admin = getServerSupabase();
    void (async () => {
      try {
        await notifyMatchesForItem(admin, data as CabinetItem);
        await dispatchAfterMatch(admin);
      } catch (e) {
        console.error("[cabinet PATCH] matching/dispatch failed:", e);
      }
    })();
  }

  revalidatePath("/cabinet");
  revalidatePath("/dashboard");
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = await getServerAuthSupabase();

  const { error: notifErr } = await supabase
    .from("notifications")
    .delete()
    .eq("medication_item_id", id);
  if (notifErr) {
    return NextResponse.json({ error: notifErr.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("medication_items")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidatePath("/cabinet");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  return NextResponse.json({ ok: true });
}

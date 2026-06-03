import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { notifyMatchesForItem, type CabinetItem } from "@/lib/matching";
import { enforceMedQuota, QuotaExceededError } from "@/lib/plan";
import { isManufacturerKnown } from "@/lib/manufacturer-verify";
import { dispatchAfterMatch } from "@/lib/dispatch-after-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase
    .from("medication_items")
    .select(
      "id, product_name, manufacturer, product_ndc, lot_number, status, added_at, manufacturer_unverified",
    )
    .eq("status", "active")
    .order("added_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

type CreateBody = {
  productName?: string;
  manufacturer?: string;
  productNdc?: string | null;
  lotNumber?: string | null;
  /** Client already confirmed unknown-manufacturer warning. */
  confirmUnverified?: boolean;
};

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const productName = body.productName?.trim() ?? "";
  const manufacturer = body.manufacturer?.trim() ?? "";
  if (!productName || !manufacturer) {
    return NextResponse.json(
      { error: "productName and manufacturer are required" },
      { status: 400 },
    );
  }

  const authSupabase = await getServerAuthSupabase();
  const { data: userData, error: userErr } = await authSupabase.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await enforceMedQuota(authSupabase, userData.user.id);
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      return NextResponse.json(e.toJson(), { status: 402 });
    }
    throw e;
  }

  const admin = getServerSupabase();
  const known = await isManufacturerKnown(admin, productName, manufacturer);
  const manufacturerUnverified = !known;

  if (manufacturerUnverified && !body.confirmUnverified) {
    return NextResponse.json(
      {
        error: "MANUFACTURER_UNVERIFIED",
        message:
          "This manufacturer is not in our FDA drug directory. We cannot monitor recalls for this entry. You can still save it, but you will not receive alerts.",
        manufacturerUnverified: true,
      },
      { status: 409 },
    );
  }

  const { data: inserted, error: insertErr } = await authSupabase
    .from("medication_items")
    .insert({
      user_id: userData.user.id,
      product_name: productName,
      manufacturer,
      product_ndc: body.productNdc?.trim() || null,
      lot_number: body.lotNumber?.trim() || null,
      manufacturer_unverified: manufacturerUnverified,
    })
    .select(
      "id, user_id, product_name, manufacturer, product_ndc, lot_number, manufacturer_unverified",
    )
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  if (!manufacturerUnverified) {
    void (async () => {
      try {
        await notifyMatchesForItem(admin, inserted as CabinetItem);
        await dispatchAfterMatch(admin);
      } catch (e) {
        console.error("[cabinet POST] matching/dispatch failed:", e);
      }
    })();
  }

  revalidatePath("/cabinet");
  revalidatePath("/dashboard");
  return NextResponse.json({ item: inserted }, { status: 201 });
}

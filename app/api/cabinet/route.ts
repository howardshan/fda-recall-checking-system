import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { notifyMatchesForItem, type CabinetItem } from "@/lib/matching";
import { enforceMedQuota, QuotaExceededError } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase
    .from("medication_items")
    .select("id, product_name, manufacturer, product_ndc, lot_number, expected_stop_date, status, added_at")
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
  expectedStopDate?: string | null;
  memberId?: number | null;
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

  const { data: inserted, error: insertErr } = await authSupabase
    .from("medication_items")
    .insert({
      user_id: userData.user.id,
      product_name: productName,
      manufacturer,
      product_ndc: body.productNdc?.trim() || null,
      lot_number: body.lotNumber?.trim() || null,
      expected_stop_date: body.expectedStopDate || null,
      member_id: body.memberId ?? null,
    })
    .select("id, user_id, product_name, manufacturer, product_ndc, lot_number, expected_stop_date")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  // Fire-and-forget: scan this new item against the recall database. Uses the
  // service-role client so the matching write isn't blocked by RLS (the row
  // it inserts is owned by the user we authenticated above).
  void (async () => {
    try {
      const admin = getServerSupabase();
      await notifyMatchesForItem(admin, inserted as CabinetItem);
    } catch (e) {
      console.error("[cabinet POST] matching failed:", e);
    }
  })();

  return NextResponse.json({ item: inserted }, { status: 201 });
}

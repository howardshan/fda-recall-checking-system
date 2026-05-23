import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import type { Plan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PLACEHOLDER: M1 has no payment. This endpoint flips profiles.plan directly.
// M2 will replace this with Stripe Checkout + webhook-driven plan updates;
// at that point this route should require the user to come back from a successful
// Stripe Checkout session (or just be deleted entirely in favor of a webhook).

type Body = { plan?: string };

const VALID: Plan[] = ["free", "personal", "family"];

export async function POST(req: Request) {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const requested = body.plan;
  if (!requested || !VALID.includes(requested as Plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ plan: requested })
    .eq("id", userData.user.id)
    .select("plan")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 },
    );
  }

  console.warn(
    `[upgrade] PLACEHOLDER: user ${userData.user.id} switched plan to ${requested} (no payment processed)`,
  );

  return NextResponse.json({ ok: true, plan: data.plan });
}

import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { canReceiveInstantEmail, getUserPlan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ preferences: data });
}

type PatchBody = {
  email_enabled?: boolean;
  email_instant_enabled?: boolean;
  email_digest_enabled?: boolean;
  alert_on_class_i?: boolean;
  alert_on_class_ii?: boolean;
  alert_on_class_iii?: boolean;
};

export async function PATCH(req: Request) {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = getServerSupabase();
  const plan = await getUserPlan(admin, userData.user.id);

  if (
    body.email_instant_enabled === true &&
    !canReceiveInstantEmail(plan)
  ) {
    return NextResponse.json(
      { error: "Instant recall emails require a Personal Pro or Family Protection plan." },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of [
    "email_enabled",
    "email_instant_enabled",
    "email_digest_enabled",
    "alert_on_class_i",
    "alert_on_class_ii",
    "alert_on_class_iii",
  ] as const) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userData.user.id, ...update });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

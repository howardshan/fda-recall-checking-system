import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = userData.user.id;

  const [profile, prefs, items, notifications] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("medication_items").select("*").eq("user_id", userId),
    supabase.from("notifications").select("*").eq("user_id", userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data ?? null,
    notification_preferences: prefs.data ?? null,
    medication_items: items.data ?? [],
    notifications: notifications.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="fdanotif-export-${userId}.json"`,
    },
  });
}

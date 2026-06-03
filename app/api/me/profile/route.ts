import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { username?: string };

const MAX_LEN = 60;

export async function PATCH(req: Request) {
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

  const username = body.username?.trim();
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  if (username.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Username must be ${MAX_LEN} characters or fewer` },
      { status: 400 },
    );
  }

  // Update auth.users metadata (so it shows up in user.user_metadata.full_name
  // for downstream code like AppShell) AND the mirrored profiles.full_name row.
  const { error: authErr } = await supabase.auth.updateUser({
    data: { full_name: username },
  });
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ full_name: username })
    .eq("id", userData.user.id);
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username });
}

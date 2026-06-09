import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type PatchBody = { status?: "read" | "unread" | "dismissed" };

export async function PATCH(req: Request, ctx: Params) {
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  const supabase = await getServerAuthSupabase();
  const patch: {
    status: string;
    email_sent_at?: string;
    dismiss_reason?: null;
  } = { status: body.status, dismiss_reason: null };
  if (body.status === "dismissed") {
    patch.email_sent_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("notifications")
    .update(patch)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}

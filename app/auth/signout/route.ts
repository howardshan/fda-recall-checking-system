import { NextResponse, type NextRequest } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const supabase = await getServerAuthSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 302 });
}

import { NextResponse, type NextRequest } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

/**
 * OAuth + email-verification callback. Supabase Auth sends users here with
 * a `code` param after they click an email link or finish a Google flow.
 * We exchange the code for a session (which writes the auth cookies) and
 * redirect to `?next=...` (defaults to /dashboard).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await getServerAuthSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errUrl = new URL("/login", url.origin);
      errUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(errUrl);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

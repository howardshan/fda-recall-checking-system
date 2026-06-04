import { NextResponse, type NextRequest } from "next/server";
import { getServerAuthSupabase } from "@/lib/auth";

/**
 * OAuth + email-verification callback. Supabase Auth sends users here with
 * a `code` param after they click an email link or finish a Google flow.
 * We exchange the code for a session (which writes the auth cookies) and
 * redirect to `?next=...` (defaults to /dashboard).
 */
function loginWithError(origin: string, message: string, next?: string) {
  const errUrl = new URL("/login", origin);
  errUrl.searchParams.set("error", message);
  if (next && next !== "/dashboard") {
    errUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(errUrl);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");

  if (oauthError) {
    return loginWithError(
      url.origin,
      oauthErrorDescription ?? oauthError,
      next,
    );
  }

  if (!code) {
    return loginWithError(
      url.origin,
      "Sign-in link is incomplete or expired. Please try again or sign in.",
      next,
    );
  }

  const supabase = await getServerAuthSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginWithError(url.origin, error.message, next);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

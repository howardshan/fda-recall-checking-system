import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerAuthSupabase } from "@/lib/auth";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function parseOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null;
  return OTP_TYPES.has(raw as EmailOtpType) ? (raw as EmailOtpType) : null;
}

/**
 * OAuth + email-verification callback.
 * - Email links use token_hash + verifyOtp (works across mail apps / browsers).
 * - OAuth (Google) uses PKCE code exchange on the same browser session.
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
  const next = url.searchParams.get("next") ?? "/dashboard";
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = parseOtpType(url.searchParams.get("type"));
  const code = url.searchParams.get("code");

  if (oauthError) {
    return loginWithError(
      url.origin,
      oauthErrorDescription ?? oauthError,
      next,
    );
  }

  const supabase = await getServerAuthSupabase();

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      return loginWithError(url.origin, error.message, next);
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginWithError(url.origin, error.message, next);
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return loginWithError(
    url.origin,
    "Sign-in link is incomplete or expired. Please try again or sign in.",
    next,
  );
}

import { NextResponse, type NextRequest } from "next/server";

/**
 * Legacy password-reset links used `/auth/reset?code=...` before redirect was
 * fixed. Forward to the auth callback so existing emails still work.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dest = new URL("/auth/callback", url.origin);
  dest.searchParams.set("next", "/reset");
  for (const [key, value] of url.searchParams.entries()) {
    dest.searchParams.set(key, value);
  }
  return NextResponse.redirect(dest);
}

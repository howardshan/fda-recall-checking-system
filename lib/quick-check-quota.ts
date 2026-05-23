/**
 * Anonymous quick-check quota. Each device (cookie scope) gets a small number
 * of free /api/check-recall calls; after that, the API returns 401 with
 * `error: "login_required"` and the UI prompts the user to sign in.
 *
 * Authenticated users bypass the quota entirely. The cookie is HTTP-only so
 * a casual visitor can't bump it from JS — but it is, by design, easy to clear
 * (incognito mode, browser data clear). This is a soft gate to encourage
 * signups, not a security boundary.
 */

import type { NextResponse } from "next/server";

export const QUICK_CHECK_LIMIT = 2;
export const QC_COOKIE_NAME = "qc_used";
const QC_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Parse the integer count from the cookie header. Returns 0 when absent or
 * malformed.
 */
export function readQuotaFromCookies(cookieHeader: string | null): number {
  if (!cookieHeader) return 0;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${QC_COOKIE_NAME}=(\\d+)`));
  if (!m) return 0;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Stamp the response with the new quota count. */
export function setQuotaCookie(res: NextResponse, value: number): void {
  res.cookies.set({
    name: QC_COOKIE_NAME,
    value: String(value),
    maxAge: QC_COOKIE_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // secure cookie only over HTTPS in prod; not strictly required for soft gate
    secure: process.env.NODE_ENV === "production",
  });
}

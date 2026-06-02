/** Base URL for Supabase Auth redirects (signup, password reset, OAuth). */
export function getAuthAppUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

export function authCallbackUrl(next = "/dashboard"): string {
  const base = getAuthAppUrl();
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

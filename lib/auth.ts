import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Server-side Supabase client bound to the request's auth cookies.
 * Use from Server Components, Route Handlers, and Server Actions.
 *
 * For service-role / admin operations (sync, seed) use lib/supabase.ts
 * `getServerSupabase()` instead.
 */
export async function getServerAuthSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from Server Component — cookies are immutable there.
          // Middleware handles cookie refresh, so this is fine to ignore.
        }
      },
    },
  });
}

/** Returns the authenticated user or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/** Throws if no user — use to guard server-rendered protected routes. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
}

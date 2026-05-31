import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchPendingEmails } from "./notification-dispatcher";

/**
 * Run instant email + SMS dispatch after new notification rows are created.
 * Respects user preferences (instant email, SMS opt-in, class filters).
 */
export async function dispatchAfterMatch(supabase: SupabaseClient): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
  await dispatchPendingEmails(supabase, appUrl).catch((e) => {
    console.error("[dispatch-after-match] failed:", e);
  });
}

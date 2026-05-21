import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

async function getUnreadCount(userId: string): Promise<number> {
  const supabase = getServerSupabase();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "unread");
  return count ?? 0;
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCount(user.id) : 0;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Account";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
          <Link href="/dashboard" className="font-display text-headline-sm text-primary">
            FDA Notification
          </Link>

          <nav className="flex items-center gap-2 md:gap-6">
            <Link
              href="/cabinet"
              className="hidden md:inline text-label-md text-on-surface-variant hover:text-secondary"
            >
              Medicine Cabinet
            </Link>
            <Link
              href="/notifications"
              className="relative inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-secondary"
            >
              <span className="hidden md:inline">Notifications</span>
              <span className="md:hidden">Alerts</span>
              {unread > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error px-1.5 text-label-sm font-semibold text-on-error">
                  {unread}
                </span>
              ) : null}
            </Link>
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full bg-primary px-3 py-1.5 text-label-md text-on-primary">
                {displayName.slice(0, 18)}
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-primary/10 bg-surface-container-lowest p-2 shadow-lg">
                <Link
                  href="/settings/notifications"
                  className="block rounded px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-low"
                >
                  Notification settings
                </Link>
                <Link
                  href="/settings/data"
                  className="block rounded px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-low"
                >
                  Data & privacy
                </Link>
                <Link
                  href="/pricing"
                  className="block rounded px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-low"
                >
                  Plan & pricing
                </Link>
                <form action="/auth/signout" method="post" className="border-t border-primary/10 pt-2 mt-1">
                  <button
                    type="submit"
                    className="block w-full rounded px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <div className="mx-auto max-w-container px-margin-mobile py-8 md:px-margin-desktop">
          {children}
        </div>
      </main>

      <footer className="border-t border-primary/10 bg-surface-container-low">
        <div className="mx-auto flex max-w-container flex-col items-center justify-between gap-2 px-margin-mobile py-6 md:flex-row md:px-margin-desktop">
          <span className="font-display text-headline-sm text-primary">FDA Notification</span>
          <div className="flex gap-4 text-label-sm text-on-surface-variant">
            <Link href="/privacy" className="hover:text-secondary">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-secondary">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-secondary">Cookies</Link>
          </div>
          <p className="text-label-sm text-on-surface-variant opacity-80">
            Information aggregation only. Not medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/auth";
import { canManageFamily, getUserPlan } from "@/lib/plan";
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
  const showFamilyNav =
    user &&
    (await getUserPlan(getServerSupabase(), user.id).then((p) => canManageFamily(p)));
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Account";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
          <Link href="/" aria-label="SafeTrack home">
            <Logo size={56} />
          </Link>

          <nav className="flex items-center gap-2 md:gap-6">
            <Link
              href="/dashboard"
              className="hidden md:inline text-label-md text-on-surface-variant hover:text-secondary"
            >
              Dashboard
            </Link>
            <Link
              href="/cabinet"
              className="hidden md:inline text-label-md text-on-surface-variant hover:text-secondary"
            >
              Medicine Cabinet
            </Link>
            {showFamilyNav ? (
              <Link
                href="/family"
                className="hidden md:inline text-label-md text-on-surface-variant hover:text-secondary"
              >
                Family
              </Link>
            ) : null}
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
            <UserMenu displayName={displayName} />
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
          <Logo size={28} />
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

import Link from "next/link";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { NavNotificationsLink } from "@/components/notifications/NavNotificationsLink";
import { UnreadNotificationsProvider } from "@/components/notifications/UnreadNotificationsProvider";
import { getCurrentUser, getServerAuthSupabase } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getUnreadCount(): Promise<number> {
  const supabase = await getServerAuthSupabase();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread");
  return count ?? 0;
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCount() : 0;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Account";

  return (
    <UnreadNotificationsProvider initialCount={unread}>
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
              <NavNotificationsLink />
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
          <LegalFooterLinks />
          <p className="text-label-sm text-on-surface-variant opacity-80">
            Information aggregation only. Not medical advice.
          </p>
        </div>
      </footer>
    </div>
    </UnreadNotificationsProvider>
  );
}

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Account";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
          <Link href="/" aria-label="SafeTrack home">
            <Logo size={40} />
          </Link>
          <nav className="flex items-center gap-4 text-label-md">
            <Link href="/check" className="text-on-surface-variant hover:text-secondary">Quick check</Link>
            <Link href="/pricing" className="text-on-surface-variant hover:text-secondary">Pricing</Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-primary px-3 py-1.5 text-on-primary"
              >
                {displayName.slice(0, 18)}
              </Link>
            ) : (
              <Link href="/login" className="text-on-surface-variant hover:text-secondary">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <div className="mx-auto max-w-container px-margin-mobile py-12 md:px-margin-desktop">
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
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { Logo } from "@/components/Logo";
import { RecallChecker } from "@/components/RecallChecker";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Quick FDA Recall Check | SafeTrack",
};

export default async function CheckPage() {
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
            <Logo size={56} />
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-primary px-3 py-1.5 text-label-md text-on-primary"
            >
              {displayName.slice(0, 18)}
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-label-md">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <div className="mx-auto max-w-2xl px-margin-mobile py-12 md:px-margin-desktop">
          <Link href="/" className="text-label-md text-secondary hover:underline">
            ← Back to home
          </Link>
          <div className="mt-4 mb-6">
            <h1 className="font-display text-headline-md text-on-surface">
              Quick FDA Recall Check
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              One-off lookup against the FDA drug recall database.
            </p>
          </div>
          <div className="card">
            <RecallChecker isLoggedIn={!!user} />
          </div>
        </div>
      </main>

      <footer className="border-t border-primary/10 bg-surface-container-low">
        <div className="mx-auto flex max-w-container flex-col items-center justify-between gap-2 px-margin-mobile py-6 md:flex-row md:px-margin-desktop">
          <Logo size={28} />
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}

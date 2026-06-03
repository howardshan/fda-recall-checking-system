import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RecallChecker } from "@/components/RecallChecker";

export const metadata = {
  title: "Quick Recall Check | SafeTrack",
};

export default function CheckPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
          <Link href="/" aria-label="SafeTrack home">
            <Logo size={56} />
          </Link>
          <Link href="/login" className="btn-primary text-label-md">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        <div className="mx-auto max-w-2xl px-margin-mobile py-12 md:px-margin-desktop">
          <Link href="/" className="text-label-md text-secondary hover:underline">
            ← Back to home
          </Link>
          <div className="mt-4 mb-6">
            <h1 className="font-display text-headline-md text-primary">Quick recall check</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              One-off lookup against the FDA drug recall database. To get email
              alerts when new recalls match medications you take,{" "}
              <Link href="/signup" className="text-secondary underline">
                create a free account
              </Link>
              .
            </p>
          </div>
          <div className="card">
            <RecallChecker />
          </div>
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

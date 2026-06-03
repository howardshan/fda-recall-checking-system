import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
          <Link href="/" aria-label="SafeTrack home">
            <Logo size={56} />
          </Link>
          <Link href="/check" className="text-label-md text-on-surface-variant hover:text-secondary">
            Quick check
          </Link>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center px-margin-mobile py-12 md:px-margin-desktop">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      <footer className="border-t border-primary/10 bg-surface-container-low">
        <div className="mx-auto flex max-w-container flex-col items-center justify-between gap-4 px-margin-mobile py-6 md:flex-row md:px-margin-desktop">
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

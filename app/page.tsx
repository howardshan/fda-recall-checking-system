import Link from "next/link";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { getMeta } from "@/lib/meta";

export default async function LandingPage() {
  const [meta, user] = await Promise.all([getMeta(), getCurrentUser()]);
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Account";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-margin-mobile py-4 md:px-margin-desktop">
          <Link href="/" aria-label="SafeTrack home">
            <Logo size={56} />
          </Link>
          <nav className="flex flex-1 items-center justify-evenly gap-4 text-label-md md:flex-none md:justify-end md:gap-6">
            <Link href="/check" className="text-on-surface-variant hover:text-secondary whitespace-nowrap">
              Quick FDA Recall Check
            </Link>
            <Link href="/pricing" className="text-on-surface-variant hover:text-secondary">
              Pricing
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-primary px-3 py-1.5 text-on-primary whitespace-nowrap"
              >
                {displayName.slice(0, 18)}
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-label-md whitespace-nowrap">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero */}
        <section className="border-b border-primary/10">
          <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop md:py-24">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
              <div>
                <p className="mb-4 inline-block rounded-full bg-primary-fixed px-3 py-1 text-label-md uppercase tracking-wider text-on-primary-fixed">
                  Faster than your pharmacy
                </p>
                <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface">
                  FDA Recall Alerts Delivered Before Your Pharmacy Calls.
                </h1>
                <p className="mt-6 text-body-lg text-on-surface-variant">
                  Add prescriptions to your personal medicine cabinet. We&apos;ll
                  email you the second the FDA publishes a matching recall —
                  before your pharmacy or the news.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className="btn-primary px-6 py-3 text-label-md">
                    Get free alerts →
                  </Link>
                  <Link href="/check" className="btn-secondary px-6 py-3 text-label-md">
                    Quick FDA Recall Check
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="rounded-xl border border-primary/10 bg-surface-container-lowest p-6 shadow-sm">
                  <div className="chip chip-i">Class I — Serious Risk</div>
                  <h3 className="mt-4 font-display text-headline-sm text-on-surface">
                    SIROLIMUS
                  </h3>
                  <p className="text-body-md text-on-surface-variant">
                    Dr. Reddy&apos;s Laboratories Limited
                  </p>
                  <p className="mt-4 text-body-md">
                    Subpotent / out-of-specification — affected lots subject to
                    recall.
                  </p>
                  <div className="mt-4 border-t border-primary/10 pt-3 text-label-sm text-on-surface-variant">
                    Recall #D-0504-2024
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three steps */}
        <section className="border-b border-primary/10 bg-surface-container-low">
          <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
            <h2 className="font-display text-headline-md text-on-surface text-center">
              How it works
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Add your medications",
                  body: "Pick from the FDA NDC directory or type freely. We support brand and generic names.",
                },
                {
                  step: "2",
                  title: "We monitor daily",
                  body: "Every day we pull the latest FDA enforcement records and match them against your cabinet.",
                },
                {
                  step: "3",
                  title: "Get alerted instantly",
                  body: "Email + in-app notification the moment one of your medications is recalled.",
                },
              ].map((s) => (
                <div key={s.step} className="card">
                  <div className="font-display text-headline-md text-secondary">{s.step}</div>
                  <h3 className="mt-2 font-display text-headline-sm text-on-surface">{s.title}</h3>
                  <p className="mt-2 text-body-md text-on-surface-variant">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust band */}
        <section className="bg-primary text-on-primary">
          <div className="mx-auto grid max-w-container grid-cols-2 gap-8 px-margin-mobile py-12 text-center md:grid-cols-4 md:px-margin-desktop">
            <div>
              <p className="font-display text-headline-md">{(meta?.recallCount ?? 0).toLocaleString("en-US")}</p>
              <p className="mt-1 text-label-sm uppercase opacity-80">
                Recalls tracked
              </p>
            </div>
            <div>
              <p className="font-display text-headline-md">{(meta?.ndcCount ?? 0).toLocaleString("en-US")}</p>
              <p className="mt-1 text-label-sm uppercase opacity-80">
                NDC products
              </p>
            </div>
            <div>
              <p className="font-display text-headline-md">Daily</p>
              <p className="mt-1 text-label-sm uppercase opacity-80">Sync from FDA</p>
            </div>
            <div>
              <p className="font-display text-headline-md">$0</p>
              <p className="mt-1 text-label-sm uppercase opacity-80">For consumers</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-margin-mobile py-16 md:px-margin-desktop">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-headline-md text-on-surface">
              Take five minutes to set up. Stay informed for years.
            </h2>
            <p className="mt-4 text-body-md text-on-surface-variant">
              Drug recalls happen quietly. By the time a notice reaches your
              pharmacy or your inbox, you may have been taking an affected lot
              for weeks. SafeTrack closes that gap.
            </p>
            <Link href="/signup" className="btn-primary mt-8 inline-flex px-6 py-3 text-label-md">
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-primary/10 bg-surface-container-low">
        <div className="mx-auto flex max-w-container flex-col items-center justify-between gap-2 px-margin-mobile py-6 md:flex-row md:px-margin-desktop">
          <Logo size={28} />
          <LegalFooterLinks />
          <p className="text-label-sm text-on-surface-variant opacity-80">
            FDA data last synced:{" "}
            {meta?.lastSyncedAt ? new Date(meta.lastSyncedAt).toLocaleString() : "Never"}
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";

export const metadata = { title: "Legal | SafeTrack" };

type Doc = {
  href: string;
  title: string;
  description: string;
};

const DOCS: Doc[] = [
  {
    href: "/privacy",
    title: "Privacy Policy",
    description:
      "What information we collect, how we use it, who we share it with, and your rights.",
  },
  {
    href: "/terms",
    title: "Terms of Service",
    description:
      "The agreement between you and SafeTrack governing your use of the service.",
  },
  {
    href: "/medical-disclaimer",
    title: "Medical Disclaimer",
    description:
      "SafeTrack is informational only — it is not medical advice and does not replace a clinician.",
  },
  {
    href: "/refund",
    title: "Subscription & Refund Policy",
    description:
      "Billing cycles, cancellation, and when refunds may be granted.",
  },
  {
    href: "/hipaa",
    title: "HIPAA Notice",
    description:
      "SafeTrack is not a HIPAA covered entity. How we handle your data anyway.",
  },
  {
    href: "/ccpa",
    title: "California Privacy Notice",
    description:
      "Additional privacy rights for California residents under the CCPA.",
  },
  {
    href: "/cookies",
    title: "Cookie Policy",
    description:
      "What cookies and similar technologies we use, and how to control them.",
  },
];

export default function LegalIndexPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/"
        className="inline-block text-label-md text-secondary hover:underline"
      >
        ← Back to homepage
      </Link>
      <header>
        <h1 className="font-display text-headline-md text-on-surface">Legal</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          All SafeTrack DV LLC policies in one place. Last updated June 2026.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DOCS.map((doc) => (
          <li key={doc.href}>
            <Link
              href={doc.href}
              className="card block h-full transition hover:border-primary/30 hover:bg-surface-container-low"
            >
              <h2 className="font-display text-headline-sm text-on-surface">
                {doc.title}
              </h2>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                {doc.description}
              </p>
              <p className="mt-4 text-label-md text-secondary">Read more →</p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-center text-label-sm text-on-surface-variant">
        Questions?{" "}
        <a
          href="mailto:support@safetrackdv.com"
          className="text-secondary underline"
        >
          support@safetrackdv.com
        </a>
      </p>
    </div>
  );
}

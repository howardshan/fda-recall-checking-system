import Link from "next/link";
import type { ReactNode } from "react";

type Section = { heading: string; body: ReactNode };

type Props = {
  title: string;
  effectiveDate: string;
  /** Top intro paragraph(s) before the first numbered section. Optional. */
  intro?: ReactNode;
  sections: Section[];
  /** Optional trailing "Contact" block — keeps the same address/email across docs. */
  contact?: ReactNode;
};

const DEFAULT_CONTACT = (
  <address className="not-italic">
    SafeTrack DV LLC
    <br />
    912 W Walnut Ave
    <br />
    Dalton, GA 30720 USA
    <br />
    <a
      href="mailto:support@safetrackdv.com"
      className="text-secondary underline"
    >
      support@safetrackdv.com
    </a>
    <br />
    <a href="https://safetrackdv.com" className="text-secondary underline">
      safetrackdv.com
    </a>
  </address>
);

export function LegalPage({
  title,
  effectiveDate,
  intro,
  sections,
  contact = DEFAULT_CONTACT,
}: Props) {
  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href="/legal"
        className="inline-block text-label-md text-secondary hover:underline"
      >
        ← All policies
      </Link>
      <header className="mt-4">
        <h1 className="font-display text-headline-md text-on-surface">{title}</h1>
        <p className="mt-2 text-label-sm text-on-surface-variant">
          Effective: {effectiveDate}
        </p>
      </header>

      {intro ? (
        <div className="mt-6 space-y-4 text-body-md text-on-surface">{intro}</div>
      ) : null}

      <div className="mt-6 space-y-8 text-body-md text-on-surface">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="font-display text-headline-sm text-on-surface">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-3 space-y-3">{s.body}</div>
          </section>
        ))}

        <section>
          <h2 className="font-display text-headline-sm text-on-surface">Contact</h2>
          <div className="mt-3 space-y-3">{contact}</div>
        </section>
      </div>
    </article>
  );
}

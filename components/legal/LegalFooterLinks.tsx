import Link from "next/link";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/medical-disclaimer", label: "Medical Disclaimer" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/hipaa", label: "HIPAA" },
  { href: "/ccpa", label: "CA Privacy" },
  { href: "/cookies", label: "Cookies" },
];

export function LegalFooterLinks() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-label-sm text-on-surface-variant">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-secondary">
          {l.label}
        </Link>
      ))}
    </div>
  );
}

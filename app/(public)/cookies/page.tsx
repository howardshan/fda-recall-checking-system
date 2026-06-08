import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Cookie Policy | SafeTrack" };

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      effectiveDate="June 2026"
      intro={
        <p>
          This Cookie Policy explains how SafeTrack DV LLC uses cookies and similar
          technologies when you visit and use safetrackdv.com and related services.
        </p>
      }
      sections={[
        {
          heading: "What Are Cookies?",
          body: (
            <p>
              Cookies are small text files stored on your device that help websites
              function properly, remember preferences, and improve user experiences.
            </p>
          ),
        },
        {
          heading: "How We Use Cookies",
          body: (
            <p>
              We use cookies and similar technologies to maintain user sessions,
              authenticate accounts, improve website security, remember preferences,
              and analyze website performance.
            </p>
          ),
        },
        {
          heading: "Types of Cookies We Use",
          body: (
            <ul className="list-disc pl-6">
              <li>
                <strong>Essential cookies:</strong> Required for website functionality
                and user authentication.
              </li>
              <li>
                <strong>Performance cookies:</strong> Help us understand how visitors
                use the website.
              </li>
              <li>
                <strong>Preference cookies:</strong> Remember user settings and
                preferences.
              </li>
              <li>
                <strong>Security cookies:</strong> Help protect accounts and prevent
                unauthorized access.
              </li>
            </ul>
          ),
        },
        {
          heading: "Third-Party Services",
          body: (
            <p>
              Third-party providers such as Stripe, Supabase, SMTP2GO, analytics
              providers, and hosting services may place cookies or similar
              technologies necessary for their services.
            </p>
          ),
        },
        {
          heading: "Managing Cookies",
          body: (
            <p>
              Most web browsers allow users to control or delete cookies through
              browser settings. Disabling certain cookies may affect website
              functionality.
            </p>
          ),
        },
        {
          heading: "Changes to This Policy",
          body: (
            <p>
              We may update this Cookie Policy from time to time. Updated versions
              will be posted on this page with a revised effective date.
            </p>
          ),
        },
      ]}
    />
  );
}

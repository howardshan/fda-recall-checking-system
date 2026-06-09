import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Privacy Policy | SafeTrack" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="June 2026"
      intro={
        <p>
          Welcome to SafeTrack DV LLC (&ldquo;SafeTrack&rdquo;). SafeTrack provides
          medication recall monitoring services that help users receive alerts when
          medications they track may be affected by FDA recalls or safety notices.
          This Privacy Policy explains how we collect, use, disclose, and protect
          your information.
        </p>
      }
      sections={[
        {
          heading: "Information We Collect",
          body: (
            <p>
              We may collect your name, email address, account information,
              subscription details, medications you track, and website usage
              information.
            </p>
          ),
        },
        {
          heading: "How We Use Your Information",
          body: (
            <p>
              We use information to provide services, send recall alerts, process
              subscriptions, improve our services, and comply with legal obligations.
            </p>
          ),
        },
        {
          heading: "FDA Recall Monitoring",
          body: (
            <p>
              SafeTrack provides informational recall monitoring only and does not
              provide medical advice, diagnosis, or treatment.
            </p>
          ),
        },
        {
          heading: "Email Communications",
          body: (
            <p>
              We may send recall alerts, account notifications, billing notices, and
              service-related emails.
            </p>
          ),
        },
        {
          heading: "Information Sharing",
          body: (
            <p>
              We do not sell personal information. We may share information with
              service providers such as Stripe, SMTP2GO, hosting providers, and
              analytics providers.
            </p>
          ),
        },
        {
          heading: "Data Security",
          body: (
            <p>
              We use commercially reasonable safeguards including encryption, secure
              password storage, and access controls.
            </p>
          ),
        },
        {
          heading: "Data Retention",
          body: (
            <p>
              We retain information as necessary to operate the service and comply
              with legal requirements.
            </p>
          ),
        },
        {
          heading: "Your Rights",
          body: (
            <p>
              You may request access, correction, deletion, or export of your
              personal information where permitted by law.
            </p>
          ),
        },
        {
          heading: "California Privacy Rights",
          body: (
            <p>
              California residents may have additional privacy rights under
              applicable law. See our{" "}
              <a href="/ccpa" className="text-secondary underline">
                California Privacy Notice
              </a>{" "}
              for details.
            </p>
          ),
        },
        {
          heading: "Children's Privacy",
          body: <p>SafeTrack is not intended for children under 13 years old.</p>,
        },
        {
          heading: "Third-Party Services",
          body: (
            <p>
              We may link to third-party services and are not responsible for their
              privacy practices.
            </p>
          ),
        },
        {
          heading: "Changes to This Policy",
          body: <p>We may update this Privacy Policy from time to time.</p>,
        },
      ]}
    />
  );
}

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "California Privacy Notice | SafeTrack" };

export default function CcpaPage() {
  return (
    <LegalPage
      title="CCPA California Privacy Notice"
      effectiveDate="June 2026"
      sections={[
        {
          heading: "Purpose",
          body: (
            <p>
              This California Privacy Notice supplements the{" "}
              <a href="/privacy" className="text-secondary underline">
                SafeTrack DV LLC Privacy Policy
              </a>{" "}
              and applies solely to California residents under the California
              Consumer Privacy Act (CCPA) and related regulations.
            </p>
          ),
        },
        {
          heading: "Information We Collect",
          body: (
            <p>
              We may collect identifiers, contact information, account information,
              internet activity information, device information, subscription
              details, and information regarding medications users choose to monitor.
            </p>
          ),
        },
        {
          heading: "Sources of Information",
          body: (
            <p>
              Information may be collected directly from users, automatically through
              website interactions, and from service providers involved in operating
              the platform.
            </p>
          ),
        },
        {
          heading: "How We Use Information",
          body: (
            <p>
              We use personal information to provide services, send recall alerts,
              process subscriptions, improve platform functionality, prevent fraud,
              and comply with legal obligations.
            </p>
          ),
        },
        {
          heading: "Information Sharing",
          body: (
            <p>
              We may disclose information to trusted service providers such as
              payment processors, email delivery providers, hosting providers,
              analytics providers, and other vendors necessary to operate the
              service.
            </p>
          ),
        },
        {
          heading: "No Sale of Personal Information",
          body: (
            <p>
              SafeTrack DV LLC does not sell personal information and does not
              knowingly share personal information for cross-context behavioral
              advertising.
            </p>
          ),
        },
        {
          heading: "California Privacy Rights",
          body: (
            <p>
              California residents may have the right to know what personal
              information is collected, request access to personal information,
              request deletion of personal information, request correction of
              inaccurate information, and receive equal service regardless of
              exercising privacy rights.
            </p>
          ),
        },
        {
          heading: "Submitting Requests",
          body: (
            <p>
              Privacy requests may be submitted by contacting SafeTrack DV LLC using
              the contact information provided below. We may verify identity before
              processing requests.
            </p>
          ),
        },
        {
          heading: "Retention",
          body: (
            <p>
              Personal information is retained only as long as reasonably necessary
              for business purposes, legal compliance, dispute resolution, and
              enforcement of agreements.
            </p>
          ),
        },
      ]}
    />
  );
}

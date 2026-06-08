import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Terms of Service | SafeTrack" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="June 2026"
      sections={[
        {
          heading: "Acceptance of Terms",
          body: (
            <p>
              By accessing or using SafeTrack DV LLC (&lsquo;SafeTrack&rsquo;), you
              agree to be bound by these Terms of Service.
            </p>
          ),
        },
        {
          heading: "Service Description",
          body: (
            <p>
              SafeTrack provides medication recall monitoring and notification
              services based on publicly available FDA information.
            </p>
          ),
        },
        {
          heading: "No Medical Advice",
          body: (
            <p>
              SafeTrack is not a healthcare provider and does not provide medical
              advice, diagnosis, treatment, or professional medical services.
            </p>
          ),
        },
        {
          heading: "User Accounts",
          body: (
            <p>
              Users are responsible for maintaining the confidentiality of account
              credentials and for all activity occurring under their account.
            </p>
          ),
        },
        {
          heading: "Subscription Plans",
          body: (
            <p>
              Certain features may require a paid subscription. Subscription fees,
              billing cycles, and plan features are disclosed on the{" "}
              <a href="/pricing" className="text-secondary underline">
                pricing page
              </a>
              .
            </p>
          ),
        },
        {
          heading: "Payments",
          body: (
            <p>
              Payments are processed by Stripe. By purchasing a subscription, you
              authorize recurring charges according to your selected plan.
            </p>
          ),
        },
        {
          heading: "Cancellation",
          body: (
            <p>
              Users may cancel subscriptions at any time. Access to paid features
              continues through the end of the current billing period unless
              otherwise stated. See our{" "}
              <a href="/refund" className="text-secondary underline">
                Subscription &amp; Refund Policy
              </a>{" "}
              for details.
            </p>
          ),
        },
        {
          heading: "Acceptable Use",
          body: (
            <p>
              You agree not to misuse the service, interfere with operations,
              attempt unauthorized access, or violate applicable laws.
            </p>
          ),
        },
        {
          heading: "Intellectual Property",
          body: (
            <p>
              All content, software, trademarks, logos, and materials provided by
              SafeTrack remain the property of SafeTrack DV LLC or its licensors.
            </p>
          ),
        },
        {
          heading: "Disclaimer of Warranties",
          body: (
            <p>
              The service is provided &lsquo;as is&rsquo; and &lsquo;as
              available&rsquo; without warranties of any kind, express or implied.
            </p>
          ),
        },
        {
          heading: "Limitation of Liability",
          body: (
            <p>
              To the fullest extent permitted by law, SafeTrack shall not be liable
              for indirect, incidental, consequential, or special damages arising
              from use of the service.
            </p>
          ),
        },
        {
          heading: "Indemnification",
          body: (
            <p>
              You agree to indemnify and hold harmless SafeTrack from claims arising
              from your use of the service or violation of these Terms.
            </p>
          ),
        },
        {
          heading: "Termination",
          body: (
            <p>
              We may suspend or terminate accounts that violate these Terms or
              applicable law.
            </p>
          ),
        },
        {
          heading: "Governing Law",
          body: (
            <p>
              These Terms shall be governed by the laws of the State of Georgia,
              United States, without regard to conflict-of-law principles.
            </p>
          ),
        },
        {
          heading: "Changes to Terms",
          body: (
            <p>
              SafeTrack may update these Terms from time to time. Continued use of
              the service constitutes acceptance of revised Terms.
            </p>
          ),
        },
      ]}
    />
  );
}

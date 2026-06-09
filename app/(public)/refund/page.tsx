import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Subscription & Refund Policy | SafeTrack" };

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Subscription & Refund Policy"
      effectiveDate="June 2026"
      sections={[
        {
          heading: "Subscription Services",
          body: (
            <p>
              SafeTrack DV LLC offers subscription-based services for medication
              recall monitoring, notifications, and related features.
            </p>
          ),
        },
        {
          heading: "Billing",
          body: (
            <p>
              Subscriptions are billed in advance on a monthly or annual basis
              through Stripe or other approved payment processors.
            </p>
          ),
        },
        {
          heading: "Cancellation",
          body: (
            <p>
              Subscribers may cancel their subscription at any time through their
              account settings or by contacting customer support. Cancellation
              prevents future renewals but does not automatically generate a refund.
            </p>
          ),
        },
        {
          heading: "Refund Policy",
          body: (
            <p>
              Subscription fees are generally non-refundable. Users will continue to
              have access to paid features through the end of the current billing
              period after cancellation.
            </p>
          ),
        },
        {
          heading: "Exceptional Refund Requests",
          body: (
            <p>
              SafeTrack may, at its sole discretion, consider refund requests in
              cases involving duplicate charges, billing errors, technical issues
              that prevent service delivery, or other exceptional circumstances.
            </p>
          ),
        },
        {
          heading: "Chargebacks",
          body: (
            <p>
              Before initiating a chargeback with a payment provider, users are
              encouraged to contact SafeTrack customer support so that we may
              attempt to resolve the issue.
            </p>
          ),
        },
        {
          heading: "Free Plan",
          body: (
            <p>
              Users on the Free Plan are not charged any subscription fees and
              therefore are not eligible for subscription refunds.
            </p>
          ),
        },
        {
          heading: "Changes to Pricing",
          body: (
            <p>
              SafeTrack reserves the right to modify subscription pricing or plan
              features. Changes will not affect the current billing cycle and will
              be communicated before renewal when required.
            </p>
          ),
        },
      ]}
    />
  );
}

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "HIPAA Notice | SafeTrack" };

export default function HipaaPage() {
  return (
    <LegalPage
      title="HIPAA Notice"
      effectiveDate="June 2026"
      sections={[
        {
          heading: "HIPAA Status",
          body: (
            <p>
              SafeTrack DV LLC is a medication recall monitoring and notification
              platform. SafeTrack is not a healthcare provider, health plan,
              healthcare clearinghouse, or covered entity under the Health Insurance
              Portability and Accountability Act (HIPAA).
            </p>
          ),
        },
        {
          heading: "Not a Covered Entity",
          body: (
            <p>
              SafeTrack does not provide medical treatment, diagnosis, healthcare
              services, insurance services, or healthcare claims processing.
              Therefore, SafeTrack is generally not subject to HIPAA requirements
              applicable to covered entities.
            </p>
          ),
        },
        {
          heading: "Information We Collect",
          body: (
            <p>
              Users may voluntarily provide information such as email addresses,
              account information, and medications they wish to track. This
              information is used solely to provide recall monitoring and
              notification services.
            </p>
          ),
        },
        {
          heading: "No Protected Health Information Services",
          body: (
            <p>
              SafeTrack is not intended to store, manage, or process protected
              health information (PHI) on behalf of healthcare providers, health
              plans, or covered entities.
            </p>
          ),
        },
        {
          heading: "Data Security",
          body: (
            <p>
              Although SafeTrack is not a HIPAA covered entity, we implement
              commercially reasonable administrative, technical, and organizational
              safeguards to protect user information.
            </p>
          ),
        },
        {
          heading: "Medical Disclaimer",
          body: (
            <p>
              Information provided through SafeTrack is for informational purposes
              only and does not constitute medical advice, diagnosis, or treatment.
              See our{" "}
              <a href="/medical-disclaimer" className="text-secondary underline">
                full Medical Disclaimer
              </a>
              .
            </p>
          ),
        },
        {
          heading: "User Responsibilities",
          body: (
            <p>
              Users should consult qualified healthcare professionals regarding any
              medication-related decisions and should not rely solely on recall
              alerts provided by SafeTrack.
            </p>
          ),
        },
      ]}
    />
  );
}

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Medical Disclaimer | SafeTrack" };

export default function MedicalDisclaimerPage() {
  return (
    <LegalPage
      title="Medical Disclaimer"
      effectiveDate="June 2026"
      intro={
        <p>
          <strong>Important notice.</strong> SafeTrack provides medication recall
          monitoring and notification services for informational purposes only.
        </p>
      }
      sections={[
        {
          heading: "No Medical Advice",
          body: (
            <p>
              The information provided through SafeTrack is not medical advice and
              should not be relied upon as a substitute for professional medical
              judgment, diagnosis, or treatment.
            </p>
          ),
        },
        {
          heading: "No Healthcare Provider Relationship",
          body: (
            <p>
              Use of SafeTrack does not create a doctor-patient, pharmacist-patient,
              or other healthcare provider relationship.
            </p>
          ),
        },
        {
          heading: "FDA Recall Information",
          body: (
            <p>
              SafeTrack uses publicly available information from the U.S. Food and
              Drug Administration (FDA) and other sources. We do not guarantee the
              completeness, accuracy, timeliness, or availability of such information.
            </p>
          ),
        },
        {
          heading: "User Responsibility",
          body: (
            <p>
              Users should consult their physician, pharmacist, or other qualified
              healthcare professional before making any medical decisions, changing
              medications, or discontinuing treatment.
            </p>
          ),
        },
        {
          heading: "Emergency Situations",
          body: (
            <p>
              If you believe you are experiencing a medical emergency, call 911 or
              seek immediate medical attention.
            </p>
          ),
        },
        {
          heading: "Limitation of Liability",
          body: (
            <p>
              SafeTrack DV LLC shall not be liable for any injury, loss, damage, or
              claim arising from reliance on information provided through the
              service.
            </p>
          ),
        },
      ]}
    />
  );
}

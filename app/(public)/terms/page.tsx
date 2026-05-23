export const metadata = { title: "Terms of Service | SafeTrack" };

export default function TermsPage() {
  return (
    <article className="prose mx-auto max-w-2xl">
      <h1 className="font-display text-headline-md text-primary">Terms of Service</h1>
      <p className="mt-2 text-label-sm text-on-surface-variant">
        Placeholder copy — replace with attorney-reviewed text before production.
      </p>
      <div className="mt-6 space-y-4 text-body-md text-on-surface">
        <p>
          By creating an account, you agree to use SafeTrack only for
          personal, non-commercial purposes related to monitoring drug recall
          information.
        </p>
        <h2 className="font-display text-headline-sm text-primary">Not medical advice</h2>
        <p>
          SafeTrack is an information aggregation service. We surface
          publicly-available FDA recall data. We do{" "}
          <strong>not provide medical advice, diagnosis, or treatment</strong>{" "}
          recommendations. Always consult a licensed pharmacist or physician
          before making any change to your medication regimen.
        </p>
        <h2 className="font-display text-headline-sm text-primary">Data accuracy</h2>
        <p>
          We rely on FDA public APIs and bulk downloads. The data may be
          incomplete, delayed, or contain errors outside our control. We
          provide no warranty of fitness for any particular purpose.
        </p>
        <h2 className="font-display text-headline-sm text-primary">Account responsibility</h2>
        <p>
          You are responsible for keeping your email address current and for the
          accuracy of the medication information you enter. Inaccurate input
          may lead to missed alerts or false alerts.
        </p>
        <h2 className="font-display text-headline-sm text-primary">Termination</h2>
        <p>
          You can delete your account at any time. We may suspend accounts
          violating these terms.
        </p>
      </div>
    </article>
  );
}

export const metadata = { title: "Privacy Policy | SafeTrack" };

export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-2xl">
      <h1 className="font-display text-headline-md text-primary">Privacy Policy</h1>
      <p className="mt-2 text-label-sm text-on-surface-variant">
        Placeholder copy — replace with attorney-reviewed text before production.
      </p>
      <div className="mt-6 space-y-4 text-body-md text-on-surface">
        <p>
          SafeTrack (&ldquo;we&rdquo;) collects only the information you provide
          when creating an account and adding medications to your cabinet:
          name (optional), email address, optional phone number, and the
          medication details you enter.
        </p>
        <h2 className="font-display text-headline-sm text-primary">How we use your data</h2>
        <ul className="list-disc pl-6">
          <li>To match your medications against FDA recall records.</li>
          <li>To send you email (and optionally SMS) notifications.</li>
          <li>To operate and improve the service.</li>
        </ul>
        <h2 className="font-display text-headline-sm text-primary">What we don&apos;t do</h2>
        <ul className="list-disc pl-6">
          <li>We do not sell or share your data with third parties.</li>
          <li>We do not provide medical or treatment advice.</li>
          <li>We do not retain your data after you delete your account.</li>
        </ul>
        <h2 className="font-display text-headline-sm text-primary">Your rights</h2>
        <p>
          You can export or delete your data at any time from the
          settings page. Email questions to{" "}
          <a href="mailto:privacy@example.com" className="text-secondary underline">
            privacy@example.com
          </a>
          .
        </p>
      </div>
    </article>
  );
}

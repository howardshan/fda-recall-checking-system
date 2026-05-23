export const metadata = { title: "Cookie Policy | SafeTrack" };

export default function CookiesPage() {
  return (
    <article className="prose mx-auto max-w-2xl">
      <h1 className="font-display text-headline-md text-primary">Cookie Policy</h1>
      <p className="mt-2 text-label-sm text-on-surface-variant">
        Placeholder copy — replace with attorney-reviewed text before production.
      </p>
      <div className="mt-6 space-y-4 text-body-md text-on-surface">
        <p>
          SafeTrack uses only the cookies required to keep you signed in
          and to remember your consent to this policy.
        </p>
        <h2 className="font-display text-headline-sm text-primary">Strictly necessary</h2>
        <ul className="list-disc pl-6">
          <li>
            <strong>Auth session cookies</strong> — issued by Supabase Auth.
            Set when you sign in; removed when you sign out.
          </li>
          <li>
            <strong>Cookie consent flag</strong> — stored in localStorage so we
            don&apos;t repeatedly show the consent banner.
          </li>
        </ul>
        <h2 className="font-display text-headline-sm text-primary">No tracking</h2>
        <p>
          We do not use advertising cookies, third-party analytics that share
          your identifier, or cross-site tracking. We do not embed Facebook
          pixels or Google Analytics with personally-identifiable identifiers.
        </p>
      </div>
    </article>
  );
}

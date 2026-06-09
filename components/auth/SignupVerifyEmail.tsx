"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { authCallbackUrl } from "@/lib/auth-redirect";

const RESEND_COOLDOWN_SEC = 60;

type Props = {
  email: string;
};

export function SignupVerifyEmail({ email }: Props) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendError(null);
    setResendOk(false);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: authCallbackUrl("/dashboard") },
      });
      if (error) throw error;
      setResendOk(true);
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e) {
      setResendError(e instanceof Error ? e.message : "Could not resend email");
    } finally {
      setResending(false);
    }
  }, [cooldown, email, resending]);

  return (
    <div className="space-y-6 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary"
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Check your inbox</h2>
        <p className="mt-3 text-body-md text-on-surface-variant">
          We sent a verification link to{" "}
          <strong className="text-on-surface">{email}</strong>. Open the email and click{" "}
          <strong className="text-on-surface">Confirm email address</strong> to finish signing up
          and sign in automatically.
        </p>
      </div>

      <div className="rounded-lg border border-primary/10 bg-surface-container-low px-4 py-3 text-left text-label-sm text-on-surface-variant">
        <p className="font-medium text-on-surface">Didn&apos;t get it?</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Check spam or promotions folders</li>
          <li>Wait a minute — delivery can take a little time</li>
          <li>Use resend below after the cooldown</li>
        </ul>
      </div>

      {resendOk ? (
        <p className="text-label-sm text-primary">Verification email sent again.</p>
      ) : null}
      {resendError ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {resendError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0 || resending}
        className="btn-secondary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {resending
          ? "Sending…"
          : cooldown > 0
            ? `Resend verification email (${cooldown}s)`
            : "Resend verification email"}
      </button>

      <p className="text-label-sm text-on-surface-variant">
        Wrong address?{" "}
        <Link href="/signup" className="text-secondary hover:underline">
          Start over
        </Link>
      </p>

      <Link href="/login" className="btn-primary inline-block w-full py-3 text-center">
        Back to sign in
      </Link>
    </div>
  );
}

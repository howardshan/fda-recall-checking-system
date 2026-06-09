"use client";

import { useState } from "react";
import Link from "next/link";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authCallbackUrl("/reset"),
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-display text-headline-sm text-on-surface">Email sent</h2>
        <p className="text-body-md text-on-surface-variant">
          If an account with <strong>{email}</strong> exists, we just sent a password reset link.
        </p>
        <Link href="/login" className="btn-secondary mt-4 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-label-md text-on-surface-variant">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input bg-surface-container-lowest"
          placeholder="name@example.com"
        />
      </div>

      {error ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

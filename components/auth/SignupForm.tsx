"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { PasswordChecklist, passwordIsValid } from "./PasswordChecklist";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }
    if (!passwordIsValid(password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (typeof window !== "undefined" ? window.location.origin : "");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: username.trim() },
          emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
      if (data.user && !data.session) {
        // Email verification required
        setSentTo(email);
      } else if (data.session) {
        // Email confirmation disabled — straight in
        router.push("/dashboard");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-display text-headline-sm text-primary">Check your inbox</h2>
        <p className="text-body-md text-on-surface-variant">
          We sent a verification link to <strong>{sentTo}</strong>. Click the link to finish creating your account.
        </p>
        <p className="text-label-sm text-on-surface-variant">
          The link will sign you in automatically. You can close this tab.
        </p>
        <Link href="/login" className="btn-secondary mt-4 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-label-md text-on-surface-variant">
          Username
        </label>
        <input
          id="username"
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input bg-surface-container-low"
          placeholder="e.g. yiqing"
        />
      </div>

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
          className="input bg-surface-container-low"
          placeholder="name@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-label-md text-on-surface-variant">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input bg-surface-container-low"
          placeholder="At least 8 characters"
        />
        <PasswordChecklist password={password} touched={password.length > 0} />
      </div>

      <label className="flex items-start gap-3 text-label-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-secondary hover:underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>.
        </span>
      </label>

      {error ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || !passwordIsValid(password)}
        className="btn-primary w-full py-3"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

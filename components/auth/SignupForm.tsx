"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { PasswordChecklist, passwordIsValid } from "./PasswordChecklist";
import { SignupVerifyEmail } from "./SignupVerifyEmail";
import { GoogleButton } from "./GoogleButton";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

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
      // Server-side pre-check: catch unconfirmed-account duplicates that Supabase's
      // signUp would silently re-send instead of flagging.
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (checkRes.ok) {
        const { exists } = (await checkRes.json()) as { exists?: boolean };
        if (exists) {
          setError(
            "An account with this email already exists. Try signing in or use the forgot-password link.",
          );
          return;
        }
      }

      const supabase = getBrowserSupabase();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: username.trim() },
          emailRedirectTo: authCallbackUrl("/dashboard"),
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setError(
          "An account with this email already exists. Try signing in or use the forgot-password link.",
        );
        return;
      }

      // Confirm-email flow: session is null; user may also be null (Supabase anti-enumeration).
      setSentTo(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return <SignupVerifyEmail email={sentTo} />;
  }

  return (
    <>
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
            className="input bg-surface-container-lowest"
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
            className="input bg-surface-container-lowest"
            placeholder="name@example.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-label-md text-on-surface-variant">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input bg-surface-container-lowest pr-12"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface hover:text-primary"
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
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
            <Link href="/terms" className="text-secondary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-secondary hover:underline">
              Privacy Policy
            </Link>
            .
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

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-primary/10" />
        <span className="text-label-sm text-on-surface-variant">or</span>
        <div className="h-px flex-1 bg-primary/10" />
      </div>

      <GoogleButton label="Sign up with Google" />

      <div className="mt-8 border-t border-primary/5 pt-6 text-center">
        <p className="text-body-md text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-secondary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}

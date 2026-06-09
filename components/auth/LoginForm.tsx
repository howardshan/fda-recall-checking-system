"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => params.get("error"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
      setLoading(false);
    }
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-label-md text-on-surface-variant">
            Password
          </label>
          <Link href="/forgot" className="text-label-sm text-secondary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input bg-surface-container-lowest pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface hover:text-primary"
          >
            {showPwd ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

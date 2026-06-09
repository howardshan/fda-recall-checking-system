"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { PasswordChecklist, passwordIsValid } from "./PasswordChecklist";

export function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-label-md text-on-surface-variant">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
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

      <div className="flex flex-col gap-2">
        <label htmlFor="confirm" className="text-label-md text-on-surface-variant">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input bg-surface-container-lowest pr-12"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface hover:text-primary"
          >
            {showConfirm ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || !passwordIsValid(password) || password !== confirmPassword}
        className="btn-primary w-full py-3"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

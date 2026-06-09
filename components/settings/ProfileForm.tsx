"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { PasswordChecklist, passwordIsValid } from "@/components/auth/PasswordChecklist";

type Initial = {
  email: string;
  username: string;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();

  // Username form
  const [username, setUsername] = useState(initial.username);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setNameMsg({ kind: "err", text: "Username cannot be empty." });
      return;
    }
    setSavingName(true);
    setNameMsg(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNameMsg({ kind: "err", text: json.error ?? `Failed (${res.status})` });
        return;
      }
      setNameMsg({ kind: "ok", text: "Username updated." });
      router.refresh();
    } catch (err) {
      setNameMsg({
        kind: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setPwdMsg({ kind: "err", text: "Enter your current password." });
      return;
    }
    if (!passwordIsValid(password)) {
      setPwdMsg({
        kind: "err",
        text: "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character.",
      });
      return;
    }
    if (password === currentPassword) {
      setPwdMsg({ kind: "err", text: "New password must differ from your current password." });
      return;
    }
    if (password !== confirmPassword) {
      setPwdMsg({ kind: "err", text: "New passwords do not match." });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const supabase = getBrowserSupabase();
      // Verify current password by attempting a sign-in with it. Success means
      // the credential is correct; failure surfaces an "incorrect password"
      // message without ever changing the stored password.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: initial.email,
        password: currentPassword,
      });
      if (signInErr) {
        setPwdMsg({ kind: "err", text: "Current password is incorrect." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setPwdMsg({ kind: "err", text: error.message });
        return;
      }
      setPwdMsg({ kind: "ok", text: "Password updated." });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdMsg({
        kind: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSavingPwd(false);
    }
  }

  function msgBanner(m: { kind: "ok" | "err"; text: string } | null) {
    if (!m) return null;
    const cls =
      m.kind === "ok"
        ? "rounded border border-primary/30 bg-primary-container px-3 py-2 text-label-sm text-on-primary-container"
        : "rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container";
    return <div className={cls}>{m.text}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">Account</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Email is locked to your sign-in identity. Username appears in your dashboard and email
            greetings.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant">Email</label>
          <input
            type="email"
            value={initial.email}
            disabled
            className="input cursor-not-allowed bg-surface-container-lowest opacity-70"
          />
        </div>

        <form onSubmit={saveUsername} className="space-y-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-label-md text-on-surface-variant">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input bg-surface-container-lowest"
            />
          </div>
          {msgBanner(nameMsg)}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingName || username.trim() === initial.username}
              className="btn-primary"
            >
              {savingName ? "Saving…" : "Save username"}
            </button>
          </div>
        </form>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">Change password</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Enter a new password. You&apos;ll stay signed in on this device.
          </p>
        </div>

        <form onSubmit={savePassword} className="space-y-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="currentPassword" className="text-label-md text-on-surface-variant">
              Current password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input bg-surface-container-lowest pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface hover:text-primary"
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="newPassword" className="text-label-md text-on-surface-variant">
              New password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPwd ? "text" : "password"}
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

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-label-md text-on-surface-variant">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
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

          {msgBanner(pwdMsg)}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                savingPwd ||
                !passwordIsValid(password) ||
                password !== confirmPassword
              }
              className="btn-primary"
            >
              {savingPwd ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

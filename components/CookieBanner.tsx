"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "fdanotif.cookieConsent.v1";

type Decision = "accepted" | "declined" | null;

export function CookieBanner() {
  const [decision, setDecision] = useState<Decision>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted" || stored === "declined") {
        setDecision(stored);
      }
    } catch {
      setDecision("accepted"); // Storage unavailable — don't nag
    }
  }, []);

  function persist(value: Exclude<Decision, null>) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }

  function accept() {
    persist("accepted");
    setDecision("accepted");
  }

  async function decline() {
    setBusy(true);
    persist("declined");
    // Clear auth session cookies. The only cookies this app sets are Supabase
    // auth cookies (per /cookies policy), so declining = signing out.
    try {
      await fetch("/auth/signout", { method: "POST" });
    } catch {
      // ignore — we still want to hide the banner
    }
    setDecision("declined");
    // Hard reload so the now-anonymous server-rendered shells reflect signed-out state.
    window.location.href = "/";
  }

  // Don't render anything until we know the stored decision (avoids flash).
  if (!hydrated || decision !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg border border-primary/10 bg-surface-container-lowest p-4 shadow-lg md:flex md:items-center md:gap-4 md:p-5"
    >
      <p className="flex-1 text-body-md text-on-surface">
        We use strictly necessary cookies to keep you signed in. No tracking, no
        ads. See our{" "}
        <Link href="/cookies" className="text-secondary underline">
          Cookie Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:flex-nowrap">
        <button
          type="button"
          onClick={decline}
          disabled={busy}
          className="btn-secondary whitespace-nowrap"
        >
          {busy ? "…" : "Decline"}
        </button>
        <button
          type="button"
          onClick={accept}
          disabled={busy}
          className="btn-primary whitespace-nowrap"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

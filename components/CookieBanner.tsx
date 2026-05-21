"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "fdanotif.cookieConsent.v1";

export function CookieBanner() {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setAccepted(stored === "true");
    } catch {
      setAccepted(true); // Storage unavailable — don't nag
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setAccepted(true);
  }

  if (accepted !== false) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg border border-primary/10 bg-surface-container-lowest p-4 shadow-lg md:flex md:items-center md:gap-4 md:p-5"
    >
      <p className="text-body-md text-on-surface">
        We use strictly necessary cookies to keep you signed in. No tracking, no
        ads. See our{" "}
        <Link href="/cookies" className="text-secondary underline">
          Cookie Policy
        </Link>
        .
      </p>
      <button type="button" onClick={accept} className="btn-primary mt-3 md:mt-0">
        Got it
      </button>
    </div>
  );
}

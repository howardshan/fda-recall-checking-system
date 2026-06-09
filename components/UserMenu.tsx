"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  displayName: string;
};

const ITEMS: { href: string; label: string }[] = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/notifications", label: "Notification settings" },
  { href: "/settings/data", label: "Data & privacy" },
  { href: "/pricing", label: "Manage subscription" },
];

export function UserMenu({ displayName }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-label-md text-on-primary"
      >
        {displayName.slice(0, 18)}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-primary/10 bg-surface-container-lowest p-2 shadow-lg"
        >
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-low"
            >
              {it.label}
            </Link>
          ))}
          <form
            action="/auth/signout"
            method="post"
            className="border-t border-primary/10 pt-2 mt-1"
          >
            <button
              type="submit"
              className="block w-full rounded px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

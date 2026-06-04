"use client";

import Link from "next/link";
import { useUnreadNotifications } from "./UnreadNotificationsProvider";

export function NavNotificationsLink() {
  const { unreadCount } = useUnreadNotifications();
  const label = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center pr-1.5 text-label-md text-on-surface-variant hover:text-secondary"
    >
      <span className="hidden md:inline">Notifications</span>
      <span className="md:hidden">Alerts</span>
      {unreadCount > 0 ? (
        <span
          aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
          className="absolute -right-0.5 -top-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[11px] font-semibold leading-none text-on-error"
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}

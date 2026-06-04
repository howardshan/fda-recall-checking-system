"use client";

import {
  markCabinetMatchPollPending,
  MATCH_POLL_DELAYS_MS,
} from "@/lib/matching-refresh-poll";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type UnreadNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  adjustUnreadCount: (delta: number) => void;
  /** Poll after async recall matching (e.g. adding a medication). */
  scheduleUnreadRefreshAfterMatching: () => void;
};

const UnreadNotificationsContext =
  createContext<UnreadNotificationsContextValue | null>(null);

export function UnreadNotificationsProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const pollTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    setUnreadCount(initialCount);
  }, [initialCount]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const json = (await res.json()) as { count?: number };
      setUnreadCount(json.count ?? 0);
    } catch {
      // keep last known count
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [pathname, refreshUnreadCount]);

  const scheduleUnreadRefreshAfterMatching = useCallback(() => {
    markCabinetMatchPollPending();
    void refreshUnreadCount();
    for (const id of pollTimeoutsRef.current) clearTimeout(id);
    pollTimeoutsRef.current = [...MATCH_POLL_DELAYS_MS].map((ms) =>
      setTimeout(() => void refreshUnreadCount(), ms),
    );
  }, [refreshUnreadCount]);

  useEffect(
    () => () => {
      for (const id of pollTimeoutsRef.current) clearTimeout(id);
    },
    [],
  );

  const adjustUnreadCount = useCallback((delta: number) => {
    setUnreadCount((current) => Math.max(0, current + delta));
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
      adjustUnreadCount,
      scheduleUnreadRefreshAfterMatching,
    }),
    [
      unreadCount,
      refreshUnreadCount,
      adjustUnreadCount,
      scheduleUnreadRefreshAfterMatching,
    ],
  );

  return (
    <UnreadNotificationsContext.Provider value={value}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}

export function useUnreadNotifications(): UnreadNotificationsContextValue {
  const ctx = useContext(UnreadNotificationsContext);
  if (!ctx) {
    throw new Error("useUnreadNotifications must be used within UnreadNotificationsProvider");
  }
  return ctx;
}

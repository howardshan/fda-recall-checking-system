"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UnreadNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  adjustUnreadCount: (delta: number) => void;
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

  const adjustUnreadCount = useCallback((delta: number) => {
    setUnreadCount((current) => Math.max(0, current + delta));
  }, []);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount, adjustUnreadCount }),
    [unreadCount, refreshUnreadCount, adjustUnreadCount],
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

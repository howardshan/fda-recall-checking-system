"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  consumeCabinetMatchPollPending,
  MATCH_POLL_DELAYS_MS,
} from "@/lib/matching-refresh-poll";

/** Re-fetch cabinet RSC after async recall matching creates notifications. */
export function CabinetMatchingRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (pathname !== "/cabinet") return;
    if (!consumeCabinetMatchPollPending()) return;

    router.refresh();
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = MATCH_POLL_DELAYS_MS.map((ms) =>
      setTimeout(() => router.refresh(), ms),
    );

    return () => {
      for (const id of timeoutsRef.current) clearTimeout(id);
    };
  }, [pathname, router]);

  return null;
}

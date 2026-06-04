/** Shared timing for post–recall-match client refresh (nav badge + cabinet cards). */
export const CABINET_MATCH_POLL_KEY = "safetrack:cabinet-match-poll";

export const MATCH_POLL_DELAYS_MS = [1000, 2500, 5000] as const;

export function markCabinetMatchPollPending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CABINET_MATCH_POLL_KEY, "1");
}

export function consumeCabinetMatchPollPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(CABINET_MATCH_POLL_KEY) !== "1") return false;
  sessionStorage.removeItem(CABINET_MATCH_POLL_KEY);
  return true;
}

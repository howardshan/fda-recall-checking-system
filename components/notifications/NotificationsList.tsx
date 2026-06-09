"use client";

import { useCallback, useEffect, useState } from "react";
import { useUnreadNotifications } from "./UnreadNotificationsProvider";

type NotificationRow = {
  id: number;
  classification: string | null;
  status: "unread" | "read" | "dismissed";
  created_at: string;
  email_sent_at: string | null;
  medication_items: {
    id: number;
    product_name: string;
    manufacturer: string;
  } | null;
  recalls: {
    recall_number: string;
    reason_for_recall: string | null;
    recall_initiation_date: string | null;
    classification: string | null;
    recalling_firm: string | null;
  } | null;
};

type Filter = "all" | "unread" | "read";

function classChip(raw: string | null): string {
  if (!raw) return "chip bg-surface-container-high text-on-surface";
  if (/class\s*iii\b/i.test(raw)) return "chip chip-iii";
  if (/class\s*ii\b/i.test(raw)) return "chip chip-ii";
  if (/class\s*i\b/i.test(raw)) return "chip chip-i";
  return "chip bg-surface-container-high text-on-surface";
}

function classLabel(raw: string | null): string {
  if (!raw) return "Unclassified";
  if (/class\s*iii\b/i.test(raw)) return "Class III";
  if (/class\s*ii\b/i.test(raw)) return "Class II";
  if (/class\s*i\b/i.test(raw)) return "Class I";
  return raw;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function NotificationsList({ initial }: { initial: NotificationRow[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const { adjustUnreadCount, refreshUnreadCount } = useUnreadNotifications();

  const visible = items.filter((n) => {
    if (filter === "all") return n.status !== "dismissed";
    return n.status === filter;
  });

  const updateStatus = useCallback(
    async (id: number, status: "read" | "unread" | "dismissed") => {
      const previous = items.find((n) => n.id === id)?.status;
      setPendingId(id);
      try {
        const res = await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Update failed");
        setItems((cur) => cur.map((n) => (n.id === id ? { ...n, status } : n)));

        if (previous === "unread" && status !== "unread") {
          adjustUnreadCount(-1);
        } else if (previous !== "unread" && status === "unread") {
          adjustUnreadCount(1);
        }
        void refreshUnreadCount();
      } catch (e) {
        console.error(e);
        alert("Could not update notification.");
      } finally {
        setPendingId(null);
      }
    },
    [items, adjustUnreadCount, refreshUnreadCount],
  );

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const unreadCount = items.filter((n) => n.status === "unread").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-primary/10 pb-3">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-label-md transition ${
              filter === f
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {f === "all" ? "All" : f === "unread" ? `Unread (${unreadCount})` : "Read"}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            {filter === "unread"
              ? "Nothing unread. You're caught up."
              : "No notifications yet. When the FDA recalls a medication in your cabinet, alerts will appear here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((n) => {
            const cls = classChip(n.recalls?.classification ?? n.classification);
            const lbl = classLabel(n.recalls?.classification ?? n.classification);
            const isUnread = n.status === "unread";
            return (
              <li
                key={n.id}
                className={`card flex flex-col gap-3 transition md:flex-row md:items-start ${
                  isUnread ? "border-error/30" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cls}>{lbl}</span>
                    {isUnread ? (
                      <span className="chip bg-error/10 text-error">New</span>
                    ) : null}
                    <span className="text-label-sm text-on-surface-variant">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-headline-sm text-on-surface">
                    {n.medication_items?.product_name ?? "(unknown)"}
                  </h3>
                  <p className="text-body-md text-on-surface-variant">
                    {n.medication_items?.manufacturer}
                  </p>
                  <p className="mt-3 text-body-md">
                    {n.recalls?.reason_for_recall ?? "See FDA notice"}
                  </p>
                  <p className="mt-2 text-label-sm text-on-surface-variant">
                    Recall #{n.recalls?.recall_number} · {n.recalls?.recalling_firm} · initiated{" "}
                    {formatDate(n.recalls?.recall_initiation_date ?? null)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 md:flex-col">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={() => updateStatus(n.id, "read")}
                      disabled={pendingId === n.id}
                      className="btn-secondary text-label-sm"
                    >
                      Mark read
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateStatus(n.id, "unread")}
                      disabled={pendingId === n.id}
                      className="btn-ghost text-label-sm"
                    >
                      Mark unread
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateStatus(n.id, "dismissed")}
                    disabled={pendingId === n.id}
                    className="btn-ghost text-label-sm text-outline hover:text-error"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

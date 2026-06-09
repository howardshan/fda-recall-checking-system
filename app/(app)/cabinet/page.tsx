import Link from "next/link";
import { CabinetMatchingRefresh } from "@/components/cabinet/CabinetMatchingRefresh";
import { getServerAuthSupabase } from "@/lib/auth";
import { listCabinetItems, type CabinetListItem } from "@/lib/cabinet-items";
import {
  parseRecallClassTier,
  recallClassChipClassForTier,
  recallClassLabelForTier,
  sortRecallClassTiers,
  type RecallClassTier,
} from "@/lib/recall-classification";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  product_name: string;
  manufacturer: string;
  product_ndc: string | null;
  lot_number: string | null;
  added_at: string;
  manufacturer_unverified: boolean;
};

async function getActiveItems(): Promise<Item[]> {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("medication_items")
    .select(
      "id, product_name, manufacturer, product_ndc, lot_number, added_at, manufacturer_unverified",
    )
    .eq("status", "active")
    .order("added_at", { ascending: false });
  return (data ?? []) as Item[];
}

async function getPausedItems(): Promise<Item[]> {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("medication_items")
    .select(
      "id, product_name, manufacturer, product_ndc, lot_number, added_at, manufacturer_unverified",
    )
    .eq("status", "paused")
    .order("added_at", { ascending: false });
  return (data ?? []) as Item[];
}

type ItemAlertSummary = {
  unreadCount: number;
  classTiers: RecallClassTier[];
};

async function getAlertSummaryByItem(): Promise<Map<number, ItemAlertSummary>> {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("notifications")
    .select("medication_item_id, classification")
    .eq("status", "unread");
  const tierSets = new Map<number, Set<RecallClassTier>>();
  const counts = new Map<number, number>();
  for (const row of (data ?? []) as {
    medication_item_id: number | null;
    classification: string | null;
  }[]) {
    if (row.medication_item_id == null) continue;
    const id = row.medication_item_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    const tier = parseRecallClassTier(row.classification);
    if (tier) {
      if (!tierSets.has(id)) tierSets.set(id, new Set());
      tierSets.get(id)!.add(tier);
    }
  }
  const map = new Map<number, ItemAlertSummary>();
  for (const [id, unreadCount] of counts) {
    map.set(id, {
      unreadCount,
      classTiers: sortRecallClassTiers(tierSets.get(id) ?? []),
    });
  }
  return map;
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

function MedCard({
  item,
  alertSummary,
  dimmed,
}: {
  item: CabinetListItem;
  alertSummary?: ItemAlertSummary;
  dimmed?: boolean;
}) {
  const unread = alertSummary?.unreadCount ?? 0;
  const classTiers = alertSummary?.classTiers ?? [];

  return (
    <Link
      href={`/cabinet/${item.id}/edit`}
      className={`card block transition hover:bg-surface-container-low ${
        unread > 0 ? "border-error/40" : ""
      } ${dimmed ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-headline-sm text-on-surface truncate">
            {item.product_name}
          </h3>
          <p className="text-body-md text-on-surface-variant truncate">
            {item.manufacturer}
          </p>
        </div>
        {item.manufacturer_unverified ? (
          <span className="chip bg-surface-container-high text-on-surface shrink-0">
            Not monitored
          </span>
        ) : dimmed ? (
          <span className="chip bg-surface-container-high text-on-surface shrink-0">
            Paused
          </span>
        ) : unread > 0 ? (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="chip bg-error/10 text-error">
              {unread} alert{unread === 1 ? "" : "s"}
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              {classTiers.length > 0 ? (
                classTiers.map((tier) => (
                  <span key={tier} className={recallClassChipClassForTier(tier)}>
                    {recallClassLabelForTier(tier)}
                  </span>
                ))
              ) : (
                <span className="chip bg-surface-container-high text-on-surface">
                  Unclassified
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="chip bg-surface-container-high text-on-surface shrink-0">
            Monitored
          </span>
        )}
      </div>
      {item.manufacturer_unverified ? (
        <p className="mt-2 text-label-sm text-on-surface-variant">
          Unknown manufacturer — recall monitoring is disabled for this entry.
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-label-sm text-on-surface-variant">
        <div>
          <dt className="opacity-70">NDC</dt>
          <dd className="font-mono">{item.product_ndc ?? "—"}</dd>
        </div>
        <div>
          <dt className="opacity-70">Lot</dt>
          <dd className="font-mono">{item.lot_number ?? "—"}</dd>
        </div>
        <div>
          <dt className="opacity-70">Added</dt>
          <dd>{formatDate(item.added_at)}</dd>
        </div>
      </dl>
    </Link>
  );
}

export default async function CabinetPage() {
  const supabase = await getServerAuthSupabase();
  const [activeResult, pausedResult, alertSummaryByItem] = await Promise.all([
    listCabinetItems(supabase, "active"),
    listCabinetItems(supabase, "paused"),
    getAlertSummaryByItem(),
  ]);

  const items = activeResult.items;
  const pausedItems = pausedResult.items;
  const loadError = activeResult.error ?? pausedResult.error;

  return (
    <>
      <CabinetMatchingRefresh />
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Medicine Cabinet</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Track your medications and get alerted the moment one is recalled.
          </p>
        </div>
        <Link href="/cabinet/add" className="btn-primary">
          + Add medication
        </Link>
      </div>

      {loadError ? (
        <div className="card border-error/30 bg-error-container text-on-error-container">
          Could not load your medications: {loadError}
        </div>
      ) : null}

      {!loadError && items.length === 0 && pausedItems.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="font-display text-headline-sm text-on-surface">Your cabinet is empty</h2>
          <p className="max-w-md text-body-md text-on-surface-variant">
            Add a medication to start receiving FDA recall alerts. We&apos;ll only contact you
            when something you take is affected.
          </p>
          <Link href="/cabinet/add" className="btn-primary">
            Add your first medication
          </Link>
        </div>
      ) : loadError ? null : (
        <>
          {items.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((item) => (
                <li key={item.id}>
                  <MedCard
                    item={item}
                    alertSummary={alertSummaryByItem.get(item.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {pausedItems.length > 0 ? (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-headline-sm text-on-surface">
                  Monitoring paused
                </h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  These medications are saved in your cabinet but are not being checked for
                  recalls. Unread alerts for paused entries were archived automatically.
                  This usually happens when your plan limit is exceeded or your
                  subscription ended.{" "}
                  <Link href="/pricing" className="text-secondary hover:underline">
                    Upgrade your plan
                  </Link>{" "}
                  to resume monitoring (oldest entries are prioritized).
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pausedItems.map((item) => (
                  <li key={item.id}>
                    <MedCard
                      item={item}
                      alertSummary={alertSummaryByItem.get(item.id)}
                      dimmed
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
    </>
  );
}

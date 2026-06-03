import Link from "next/link";
import { getServerAuthSupabase } from "@/lib/auth";
import { listCabinetItems, type CabinetListItem } from "@/lib/cabinet-items";

export const dynamic = "force-dynamic";

async function getUnreadByItem(): Promise<Map<number, number>> {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("notifications")
    .select("medication_item_id, status")
    .eq("status", "unread");
  const map = new Map<number, number>();
  for (const row of (data ?? []) as { medication_item_id: number | null }[]) {
    if (row.medication_item_id == null) continue;
    map.set(row.medication_item_id, (map.get(row.medication_item_id) ?? 0) + 1);
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

function memberLabel(item: CabinetListItem): string | null {
  if (item.member_display_name) return item.member_display_name;
  if (item.member_id != null) return "Family member";
  return null;
}

function MedCard({
  item,
  unread,
  dimmed,
}: {
  item: CabinetListItem;
  unread: number;
  dimmed?: boolean;
}) {
  const forLabel = memberLabel(item);
  return (
    <Link
      href={`/cabinet/${item.id}/edit`}
      className={`card block transition hover:bg-surface-container-low ${
        unread > 0 ? "border-error/40" : ""
      } ${dimmed ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-headline-sm text-primary truncate">
            {item.product_name}
          </h3>
          <p className="text-body-md text-on-surface-variant truncate">
            {item.manufacturer}
          </p>
          {forLabel ? (
            <p className="mt-1 text-label-sm text-secondary">For: {forLabel}</p>
          ) : null}
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
          <span className="chip chip-i shrink-0">
            {unread} alert{unread === 1 ? "" : "s"}
          </span>
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
  const [activeResult, pausedResult, unreadByItem] = await Promise.all([
    listCabinetItems(supabase, "active"),
    listCabinetItems(supabase, "paused"),
    getUnreadByItem(),
  ]);

  const items = activeResult.items;
  const pausedItems = pausedResult.items;
  const loadError = activeResult.error ?? pausedResult.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-headline-md text-primary">Medicine Cabinet</h1>
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
          <h2 className="font-display text-headline-sm text-primary">Your cabinet is empty</h2>
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
                  <MedCard item={item} unread={unreadByItem.get(item.id) ?? 0} />
                </li>
              ))}
            </ul>
          ) : null}

          {pausedItems.length > 0 ? (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-headline-sm text-primary">
                  Monitoring paused
                </h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  These medications are saved in your cabinet but are not being checked for
                  recalls. This usually happens when your plan limit is exceeded or your
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
                      unread={unreadByItem.get(item.id) ?? 0}
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
  );
}

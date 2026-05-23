import Link from "next/link";
import { getServerAuthSupabase } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  product_name: string;
  manufacturer: string;
  product_ndc: string | null;
  lot_number: string | null;
  added_at: string;
};

async function getItems(): Promise<Item[]> {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("medication_items")
    .select("id, product_name, manufacturer, product_ndc, lot_number, added_at")
    .eq("status", "active")
    .order("added_at", { ascending: false });
  return (data ?? []) as Item[];
}

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

export default async function CabinetPage() {
  const [items, unreadByItem] = await Promise.all([getItems(), getUnreadByItem()]);

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

      {items.length === 0 ? (
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
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const unread = unreadByItem.get(item.id) ?? 0;
            return (
              <li key={item.id}>
                <Link
                  href={`/cabinet/${item.id}/edit`}
                  className={`card block transition hover:bg-surface-container-low ${
                    unread > 0 ? "border-error/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-headline-sm text-primary truncate">
                        {item.product_name}
                      </h3>
                      <p className="text-body-md text-on-surface-variant truncate">
                        {item.manufacturer}
                      </p>
                    </div>
                    {unread > 0 ? (
                      <span className="chip chip-i shrink-0">
                        {unread} alert{unread === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="chip bg-surface-container-high text-on-surface shrink-0">
                        Monitored
                      </span>
                    )}
                  </div>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

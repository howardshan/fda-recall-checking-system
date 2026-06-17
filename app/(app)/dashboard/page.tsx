import Link from "next/link";
import { getServerAuthSupabase } from "@/lib/auth";
import { getStaleSyncWarning } from "@/lib/meta";

export const dynamic = "force-dynamic";

type AlertRow = {
  id: number;
  classification: string | null;
  created_at: string;
  status: string;
  medication_items: { id: number; product_name: string; manufacturer: string } | null;
  recalls: { recall_number: string; reason_for_recall: string | null } | null;
};

type Counts = { cabinet: number; unread: number };

async function getCounts(): Promise<Counts> {
  const supabase = await getServerAuthSupabase();
  const [cabinetRes, unreadRes] = await Promise.all([
    supabase
      .from("medication_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread"),
  ]);
  return { cabinet: cabinetRes.count ?? 0, unread: unreadRes.count ?? 0 };
}

async function getRecentAlerts(): Promise<AlertRow[]> {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, classification, status, created_at, medication_items(id, product_name, manufacturer), recalls(recall_number, reason_for_recall)",
    )
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []) as unknown as AlertRow[];
}

function classChip(c: string | null): string {
  if (!c) return "chip bg-surface-container-high text-on-surface";
  if (/class\s*i\b/i.test(c)) return "chip chip-i";
  if (/class\s*ii\b/i.test(c)) return "chip chip-ii";
  return "chip chip-iii";
}

export default async function DashboardPage() {
  const [counts, alerts, staleWarning] = await Promise.all([
    getCounts(),
    getRecentAlerts(),
    getStaleSyncWarning(),
  ]);
  const actionRequired = counts.unread > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Dashboard</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Your medication safety summary at a glance.
        </p>
      </div>

      {staleWarning ? (
        <div className="rounded-lg border-2 border-secondary bg-secondary-fixed p-4 text-on-secondary-fixed-variant">
          <strong className="font-semibold">Operations notice:</strong> {staleWarning}
        </div>
      ) : null}

      {/* Status banner */}
      <div
        className={`rounded-lg border-2 p-6 ${
          actionRequired
            ? "border-error bg-error-container"
            : "border-primary/20 bg-surface-container-low"
        }`}
      >
        <h2 className="font-display text-headline-sm">
          {actionRequired
            ? `${counts.unread} action${counts.unread === 1 ? "" : "s"} required`
            : "All clear"}
        </h2>
        <p className="mt-2 text-body-md">
          {actionRequired
            ? "One or more medications in your cabinet have matching FDA recall notices."
            : "No matching recalls for medications in your cabinet right now."}
        </p>
        {actionRequired ? (
          <Link href="/notifications" className="btn-primary mt-4 inline-flex">
            Review alerts
          </Link>
        ) : null}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-label-md uppercase text-on-surface-variant">Cabinet</p>
          <p className="mt-2 font-display text-headline-md text-primary">{counts.cabinet}</p>
          <Link href="/cabinet" className="mt-3 inline-block text-label-md text-secondary hover:underline">
            Manage medications →
          </Link>
        </div>
        <div className="card">
          <p className="text-label-md uppercase text-on-surface-variant">Unread alerts</p>
          <p className="mt-2 font-display text-headline-md text-primary">{counts.unread}</p>
          <Link href="/notifications" className="mt-3 inline-block text-label-md text-secondary hover:underline">
            View notifications →
          </Link>
        </div>
        <div className="card">
          <p className="text-label-md uppercase text-on-surface-variant">Quick FDA Recall Check</p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Check a one-off medication without adding it to your cabinet.
          </p>
          <Link href="/check" className="mt-3 inline-block text-label-md text-secondary hover:underline">
            Open Quick FDA Recall Check →
          </Link>
        </div>
      </div>

      {/* Recent alerts */}
      <div className="card">
        <h2 className="font-display text-headline-sm text-on-surface">Recent alerts</h2>
        {alerts.length === 0 ? (
          <p className="mt-4 text-body-md text-on-surface-variant">
            Nothing to show yet. When the FDA publishes a recall that matches one of your medications,
            it will appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-primary/10">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={classChip(a.classification)}>
                      {a.classification ?? "Unclassified"}
                    </span>
                    {a.medication_items ? (
                      <span className="text-label-md text-on-surface">
                        {a.medication_items.product_name}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-label-sm text-on-surface-variant">
                    {a.recalls?.reason_for_recall ?? "—"}
                  </p>
                </div>
                <Link
                  href="/notifications"
                  className="shrink-0 text-label-md text-secondary hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

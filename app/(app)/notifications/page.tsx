import { getServerAuthSupabase } from "@/lib/auth";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("notifications")
    .select(
      `
      id, classification, status, created_at, email_sent_at,
      medication_items(id, product_name, manufacturer),
      recalls(recall_number, reason_for_recall, recall_initiation_date, classification, recalling_firm)
      `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const initial = (data ?? []) as unknown as Parameters<typeof NotificationsList>[0]["initial"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Notifications</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          FDA recall alerts for medications in your cabinet.
        </p>
      </div>
      <NotificationsList initial={initial} />
    </div>
  );
}

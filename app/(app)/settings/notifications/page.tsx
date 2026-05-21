import { getServerAuthSupabase } from "@/lib/auth";
import { PreferencesForm, type Preferences } from "@/components/settings/PreferencesForm";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  let prefs: Preferences | null = null;
  if (userId) {
    const { data } = await supabase
      .from("notification_preferences")
      .select(
        "email_enabled, sms_enabled, phone_number, alert_on_class_i, alert_on_class_ii, alert_on_class_iii, alert_after_stop_date",
      )
      .eq("user_id", userId)
      .maybeSingle();
    prefs = (data as Preferences | null) ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-headline-md text-primary">Notification settings</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Choose how and when we alert you to FDA recalls.
        </p>
      </div>
      <PreferencesForm initial={prefs} />
    </div>
  );
}

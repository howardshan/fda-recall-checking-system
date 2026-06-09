import { getCurrentUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { ProfileForm } from "@/components/settings/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile | SafeTrack" };

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null; // middleware should redirect anyway

  const supabase = getServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const initial = {
    email: profile?.email ?? user.email ?? "",
    username:
      (profile?.full_name as string | null) ??
      (user.user_metadata?.full_name as string | undefined) ??
      "",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Profile</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Update your username or change your password.
        </p>
      </div>
      <ProfileForm initial={initial} />
    </div>
  );
}

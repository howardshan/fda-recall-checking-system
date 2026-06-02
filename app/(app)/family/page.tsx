import Link from "next/link";
import { getServerAuthSupabase } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { canManageFamily, getUserPlan, PLAN_LABEL } from "@/lib/plan";
import { FamilyMembersList, type FamilyMember } from "@/components/family/FamilyMembersList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Family Members | SafeTrack" };

export default async function FamilyPage() {
  const supabase = await getServerAuthSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  let plan = "free" as Awaited<ReturnType<typeof getUserPlan>>;
  if (userId) {
    plan = await getUserPlan(getServerSupabase(), userId);
  }

  if (!canManageFamily(plan)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-headline-md text-primary">Family members</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Manage separate medicine cabinets for up to 5 people with{" "}
            {PLAN_LABEL.family}.
          </p>
        </div>
        <div className="card space-y-4 text-center">
          <p className="text-body-md text-on-surface-variant">
            Your current plan is <strong>{PLAN_LABEL[plan]}</strong>. Upgrade to add family
            members and assign medications to each person.
          </p>
          <Link href="/pricing" className="btn-primary inline-block">
            View {PLAN_LABEL.family} plans
          </Link>
        </div>
      </div>
    );
  }

  const { data } = await supabase
    .from("family_members")
    .select("id, display_name, relationship, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-headline-md text-primary">Family members</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Keep a separate cabinet for each person in your care.
        </p>
      </div>
      <FamilyMembersList initial={(data ?? []) as FamilyMember[]} />
    </div>
  );
}

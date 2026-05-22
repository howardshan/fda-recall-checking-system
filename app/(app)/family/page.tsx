import { getServerAuthSupabase } from "@/lib/auth";
import { FamilyMembersList, type FamilyMember } from "@/components/family/FamilyMembersList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Family Members | SafeTrack" };

export default async function FamilyPage() {
  const supabase = await getServerAuthSupabase();
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

import Link from "next/link";
import { MedicationForm, type FamilyOption } from "@/components/cabinet/MedicationForm";
import { getServerAuthSupabase } from "@/lib/auth";

export const metadata = {
  title: "Add Medication | FDA Notification",
};

export const dynamic = "force-dynamic";

export default async function AddMedicationPage() {
  const supabase = await getServerAuthSupabase();
  const { data } = await supabase
    .from("family_members")
    .select("id, display_name")
    .order("created_at", { ascending: true });
  const familyOptions = (data ?? []) as FamilyOption[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cabinet" className="text-label-md text-secondary hover:underline">
        ← Back to cabinet
      </Link>
      <div>
        <h1 className="font-display text-headline-md text-primary">Add a medication</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Start typing the drug name and pick from the dropdown for the most accurate match.
        </p>
      </div>
      <div className="card">
        <MedicationForm mode="create" familyOptions={familyOptions} />
      </div>
    </div>
  );
}

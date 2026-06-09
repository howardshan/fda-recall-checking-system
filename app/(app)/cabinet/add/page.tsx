import Link from "next/link";
import { MedicationForm } from "@/components/cabinet/MedicationForm";

export const metadata = {
  title: "Add Medication | SafeTrack",
};

export const dynamic = "force-dynamic";

export default function AddMedicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cabinet" className="text-label-md text-secondary hover:underline">
        ← Back to cabinet
      </Link>
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Add a medication</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Start typing the drug name and pick from the dropdown for the most accurate match.
        </p>
      </div>
      <div className="card">
        <MedicationForm mode="create" />
      </div>
    </div>
  );
}

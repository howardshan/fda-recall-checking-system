import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MedicationForm,
  type MedicationFormValues,
} from "@/components/cabinet/MedicationForm";
import { getServerAuthSupabase } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ItemRow = {
  id: number;
  product_name: string;
  manufacturer: string;
  product_ndc: string | null;
  lot_number: string | null;
  status: string;
};

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) return notFound();

  const supabase = await getServerAuthSupabase();
  const { data, error } = await supabase
    .from("medication_items")
    .select("id, product_name, manufacturer, product_ndc, lot_number, status")
    .eq("id", id)
    .single();
  if (error || !data) return notFound();
  const item = data as ItemRow;
  if (item.status === "deleted") return notFound();

  const initial: MedicationFormValues = {
    productName: item.product_name,
    manufacturer: item.manufacturer,
    productNdc: item.product_ndc ?? "",
    lotNumber: item.lot_number ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cabinet" className="text-label-md text-secondary hover:underline">
        ← Back to cabinet
      </Link>
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Edit medication</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Update details or remove this entry from monitoring.
        </p>
      </div>
      <div className="card">
        <MedicationForm mode="edit" initial={initial} itemId={item.id} />
      </div>
    </div>
  );
}

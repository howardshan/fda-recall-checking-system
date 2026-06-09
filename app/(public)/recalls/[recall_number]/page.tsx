import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Recall = {
  id: number;
  recall_number: string;
  recalling_firm: string | null;
  product_description: string | null;
  brand_name: string | null;
  generic_name: string | null;
  manufacturer_name: string | null;
  reason_for_recall: string | null;
  classification: string | null;
  status: string | null;
  recall_initiation_date: string | null;
  code_info: string | null;
  distribution_pattern: string | null;
  product_ndc: string[] | null;
  package_ndc: string[] | null;
};

function classChip(c: string | null): string {
  if (!c) return "chip bg-surface-container-high text-on-surface";
  if (/class\s*iii\b/i.test(c)) return "chip chip-iii";
  if (/class\s*ii\b/i.test(c)) return "chip chip-ii";
  if (/class\s*i\b/i.test(c)) return "chip chip-i";
  return "chip bg-surface-container-high text-on-surface";
}

function classLabel(c: string | null): string {
  if (!c) return "Unclassified";
  if (/class\s*iii\b/i.test(c)) return "Class III — Low Risk";
  if (/class\s*ii\b/i.test(c)) return "Class II — Moderate Risk";
  if (/class\s*i\b/i.test(c)) return "Class I — Serious Risk";
  return c;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function RecallDetailPage({
  params,
}: {
  params: Promise<{ recall_number: string }>;
}) {
  const { recall_number } = await params;
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("recalls")
    .select("*")
    .eq("recall_number", decodeURIComponent(recall_number))
    .maybeSingle();
  if (error || !data) return notFound();
  const r = data as Recall;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/recalls" className="text-label-md text-secondary hover:underline">
        ← Back to browser
      </Link>

      <div
        className={`rounded-lg border-2 p-6 ${
          /class\s*i\b/i.test(r.classification ?? "") && !/class\s*ii\b/i.test(r.classification ?? "")
            ? "border-error bg-error-container text-on-error-container"
            : /class\s*ii\b/i.test(r.classification ?? "") && !/class\s*iii\b/i.test(r.classification ?? "")
              ? "border-secondary bg-secondary-fixed text-on-secondary-fixed-variant"
              : "border-primary/20 bg-surface-container-low text-on-surface"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={classChip(r.classification)}>{classLabel(r.classification)}</span>
          <span className="text-label-md">{r.status ?? "—"}</span>
        </div>
        <h1 className="mt-4 font-display text-headline-md">
          {r.brand_name || r.generic_name || r.product_description || "(unnamed)"}
        </h1>
        <p className="mt-2 text-body-lg">{r.recalling_firm}</p>
      </div>

      <section className="card">
        <h2 className="font-display text-headline-sm text-on-surface">Reason for recall</h2>
        <p className="mt-2 text-body-md">{r.reason_for_recall ?? "—"}</p>
      </section>

      {r.product_description ? (
        <section className="card">
          <h2 className="font-display text-headline-sm text-on-surface">Product description</h2>
          <p className="mt-2 whitespace-pre-wrap text-body-md">{r.product_description}</p>
        </section>
      ) : null}

      <section className="card">
        <h2 className="font-display text-headline-sm text-on-surface">Details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-body-md sm:grid-cols-2">
          <div>
            <dt className="text-label-sm uppercase text-on-surface-variant">Recall number</dt>
            <dd className="mt-1 font-mono">{r.recall_number}</dd>
          </div>
          <div>
            <dt className="text-label-sm uppercase text-on-surface-variant">Initiated</dt>
            <dd className="mt-1">{formatDate(r.recall_initiation_date)}</dd>
          </div>
          <div>
            <dt className="text-label-sm uppercase text-on-surface-variant">Recalling firm</dt>
            <dd className="mt-1">{r.recalling_firm ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-label-sm uppercase text-on-surface-variant">Manufacturer</dt>
            <dd className="mt-1">{r.manufacturer_name ?? "—"}</dd>
          </div>
          {r.product_ndc && r.product_ndc.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-label-sm uppercase text-on-surface-variant">Product NDCs</dt>
              <dd className="mt-1 font-mono text-label-md">{r.product_ndc.join(", ")}</dd>
            </div>
          ) : null}
          {r.code_info ? (
            <div className="sm:col-span-2">
              <dt className="text-label-sm uppercase text-on-surface-variant">Lot info (code_info)</dt>
              <dd className="mt-1 whitespace-pre-wrap font-mono text-label-md">{r.code_info}</dd>
            </div>
          ) : null}
          {r.distribution_pattern ? (
            <div className="sm:col-span-2">
              <dt className="text-label-sm uppercase text-on-surface-variant">Distribution pattern</dt>
              <dd className="mt-1">{r.distribution_pattern}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <p className="text-label-sm text-on-surface-variant">
        Read the official FDA notice:{" "}
        <a
          href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary underline"
        >
          fda.gov/safety/recalls
        </a>
      </p>
    </article>
  );
}

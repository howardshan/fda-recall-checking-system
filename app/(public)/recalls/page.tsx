import { Suspense } from "react";
import { RecallBrowser } from "@/components/recalls/RecallBrowser";

export const metadata = {
  title: "Browse FDA Recalls | SafeTrack",
};

export default function RecallsBrowserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Browse FDA recalls</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Search the FDA enforcement database. Filter by classification or date
          to find historical recalls.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="card py-16 text-center text-body-md text-on-surface-variant">
            Loading…
          </div>
        }
      >
        <RecallBrowser />
      </Suspense>
    </div>
  );
}

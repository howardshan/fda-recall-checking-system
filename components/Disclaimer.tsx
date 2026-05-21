export function Disclaimer() {
  return (
    <div className="rounded-md border border-secondary-fixed bg-secondary-fixed/40 p-3 text-label-sm leading-relaxed text-on-surface">
      Results are informational only.{" "}
      <strong>Not medical advice.</strong> Always consult your pharmacist or
      physician. Data sourced from{" "}
      <a
        href="https://open.fda.gov/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-secondary underline"
      >
        OpenFDA
      </a>
      ; non-US drugs are out of scope.
    </div>
  );
}

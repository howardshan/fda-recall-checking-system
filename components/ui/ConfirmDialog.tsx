"use client";

import { useEffect, useId, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive actions (e.g. cancel subscription) use error styling on confirm. */
  variant?: "default" | "danger";
  size?: "md" | "lg";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Not now",
  variant = "default",
  size = "md",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "btn-primary bg-error text-on-error hover:opacity-90"
      : "btn-primary";
  const widthClass = size === "lg" ? "max-w-3xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className={`card w-full space-y-5 shadow-xl ${widthClass}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h2
            id={titleId}
            className="font-display text-headline-sm text-on-surface"
          >
            {title}
          </h2>
          {description ? (
            <p id={descId} className="text-body-md text-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
        {details ? <div className="space-y-3">{details}</div> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${confirmClass} w-full sm:w-auto`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

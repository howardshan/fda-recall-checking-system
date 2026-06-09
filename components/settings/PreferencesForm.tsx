"use client";

import Link from "next/link";
import { useState } from "react";
import { canReceiveInstantEmail, type Plan } from "@/lib/plan";

export type Preferences = {
  email_enabled: boolean;
  email_instant_enabled: boolean;
  email_digest_enabled: boolean;
  alert_on_class_i: boolean;
  alert_on_class_ii: boolean;
  alert_on_class_iii: boolean;
};

const DEFAULT_PREFS: Preferences = {
  email_enabled: true,
  email_instant_enabled: true,
  email_digest_enabled: true,
  alert_on_class_i: true,
  alert_on_class_ii: true,
  alert_on_class_iii: false,
};

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-primary"
      />
      <div className="flex-1">
        <div className="text-label-md text-on-surface">{label}</div>
        {description ? (
          <p className="mt-1 text-label-sm text-on-surface-variant">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

export function PreferencesForm({
  initial,
  currentPlan = "free",
}: {
  initial: Preferences | null;
  currentPlan?: Plan;
}) {
  const instantAllowed = canReceiveInstantEmail(currentPlan);
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const base = initial ?? DEFAULT_PREFS;
    if (!instantAllowed && base.email_instant_enabled) {
      return { ...base, email_instant_enabled: false };
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Preferences>(key: K, v: Preferences[K]) {
    setPrefs((cur) => ({ ...cur, [key]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Save failed");
      }
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSave}>
      <section className="card">
        <h2 className="font-display text-headline-sm text-on-surface">Channels</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Where should we send your recall alerts?
        </p>
        <div className="mt-4 divide-y divide-primary/10">
          <Toggle
            label="Email"
            description="Master switch for all email from SafeTrack."
            checked={prefs.email_enabled}
            onChange={(v) => set("email_enabled", v)}
          />
          {prefs.email_enabled ? (
            <>
              {instantAllowed ? (
                <Toggle
                  label="Instant recall alerts"
                  description="Class-styled email as soon as we detect a match for your cabinet."
                  checked={prefs.email_instant_enabled}
                  onChange={(v) => set("email_instant_enabled", v)}
                />
              ) : (
                <div className="py-3">
                  <p className="text-label-md text-on-surface">Instant recall alerts</p>
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    Available on Personal Pro and Family Protection. Free accounts receive a
                    daily digest instead.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-2 inline-block text-label-md text-secondary hover:underline"
                  >
                    View plans →
                  </Link>
                </div>
              )}
              <Toggle
                label="Daily digest"
                description="One summary per day — includes matches or an all-clear check."
                checked={prefs.email_digest_enabled}
                onChange={(v) => set("email_digest_enabled", v)}
              />
            </>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h2 className="font-display text-headline-sm text-on-surface">Severity classes</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          In-app alerts in your notification center always show matching recalls. These
          toggles filter email only — instant recall emails (paid plans) and what goes
          into your daily digest. Class I is always recommended for email.
        </p>
        <div className="mt-4 divide-y divide-primary/10">
          <Toggle
            label="Class I — Serious risk"
            description="Reasonable probability of serious adverse health consequences."
            checked={prefs.alert_on_class_i}
            onChange={(v) => set("alert_on_class_i", v)}
          />
          <Toggle
            label="Class II — Moderate risk"
            description="Possible temporary or reversible health consequences."
            checked={prefs.alert_on_class_ii}
            onChange={(v) => set("alert_on_class_ii", v)}
          />
          <Toggle
            label="Class III — Low risk"
            description="Labeling / minor quality issues. Off by default to reduce noise."
            checked={prefs.alert_on_class_iii}
            onChange={(v) => set("alert_on_class_iii", v)}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {savedAt && Date.now() - savedAt < 4000 ? (
          <span className="text-label-sm text-primary">Saved.</span>
        ) : null}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}

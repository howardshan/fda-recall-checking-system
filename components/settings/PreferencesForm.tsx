"use client";

import { useState } from "react";

export type Preferences = {
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_number: string | null;
  alert_on_class_i: boolean;
  alert_on_class_ii: boolean;
  alert_on_class_iii: boolean;
  alert_after_stop_date: boolean;
};

const DEFAULT_PREFS: Preferences = {
  email_enabled: true,
  sms_enabled: false,
  phone_number: null,
  alert_on_class_i: true,
  alert_on_class_ii: true,
  alert_on_class_iii: false,
  alert_after_stop_date: false,
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

export function PreferencesForm({ initial }: { initial: Preferences | null }) {
  const [prefs, setPrefs] = useState<Preferences>(initial ?? DEFAULT_PREFS);
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
        <h2 className="font-display text-headline-sm text-primary">Channels</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Where should we send your recall alerts?
        </p>
        <div className="mt-4 divide-y divide-primary/10">
          <Toggle
            label="Email"
            description="Sent to the address on your account. Always recommended."
            checked={prefs.email_enabled}
            onChange={(v) => set("email_enabled", v)}
          />
          <Toggle
            label="SMS"
            description="Phase 2 — requires phone verification. Class I + II only (short message limit)."
            checked={prefs.sms_enabled}
            onChange={(v) => set("sms_enabled", v)}
          />
          {prefs.sms_enabled ? (
            <div className="py-3">
              <label className="flex flex-col gap-2">
                <span className="text-label-md text-on-surface-variant">Phone number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  className="input bg-surface-container-low font-mono"
                  placeholder="+1 555 555 5555"
                  value={prefs.phone_number ?? ""}
                  onChange={(e) => set("phone_number", e.target.value || null)}
                />
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h2 className="font-display text-headline-sm text-primary">Severity classes</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Choose which FDA classifications you want alerts for. Class I is
          always recommended.
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

      <section className="card">
        <h2 className="font-display text-headline-sm text-primary">After expected end of treatment</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Whether to keep alerting after a medication&apos;s expected stop date.
          Class I recalls always fire regardless.
        </p>
        <div className="mt-4">
          <Toggle
            label="Keep monitoring past stop date"
            description="If off, only Class I recalls will trigger after the stop date."
            checked={prefs.alert_after_stop_date}
            onChange={(v) => set("alert_after_stop_date", v)}
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

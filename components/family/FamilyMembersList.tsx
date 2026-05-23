"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UpgradeModal, type QuotaError } from "@/components/billing/UpgradeModal";

export type FamilyMember = {
  id: number;
  display_name: string;
  relationship: string | null;
  created_at: string;
};

export function FamilyMembersList({ initial }: { initial: FamilyMember[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newRel, setNewRel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: newName.trim(),
          relationship: newRel.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        member?: FamilyMember;
        error?: string;
        resource?: "meds" | "familyMembers";
        currentPlan?: "free" | "personal" | "family";
        limit?: number;
        upgradeTo?: "free" | "personal" | "family" | null;
      };
      if (res.status === 402 && json.error === "QUOTA_EXCEEDED" && json.resource && json.currentPlan && typeof json.limit === "number") {
        setQuotaError({
          resource: json.resource,
          currentPlan: json.currentPlan,
          limit: json.limit,
          upgradeTo: json.upgradeTo ?? null,
        });
        return;
      }
      if (!res.ok || !json.member) throw new Error(json.error ?? "Add failed");
      setMembers((m) => [...m, json.member!]);
      setNewName("");
      setNewRel("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this family member and all their medications?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Delete failed");
      }
      setMembers((m) => m.filter((mm) => mm.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="card space-y-4">
        <h2 className="font-display text-headline-sm text-primary">Add a member</h2>
        <p className="text-body-md text-on-surface-variant">
          Track medications for a spouse, child, or anyone else you care for.
          Each member has their own cabinet and notifications.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-label-md text-on-surface-variant">
              Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input bg-surface-container-low"
              placeholder="e.g. Mom"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-label-md text-on-surface-variant">
              Relationship <span className="text-outline">(optional)</span>
            </label>
            <input
              type="text"
              value={newRel}
              onChange={(e) => setNewRel(e.target.value)}
              className="input bg-surface-container-low"
              placeholder="e.g. Parent"
            />
          </div>
        </div>
        {error ? (
          <div className="rounded border border-error/30 bg-error-container px-3 py-2 text-label-sm text-on-error-container">
            {error}
          </div>
        ) : null}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Adding…" : "Add member"}
        </button>
      </form>

      {members.length === 0 ? (
        <div className="card py-8 text-center">
          <p className="text-body-md text-on-surface-variant">No family members yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="card flex items-center justify-between">
              <div>
                <h3 className="font-display text-headline-sm text-primary">{m.display_name}</h3>
                {m.relationship ? (
                  <p className="text-label-md text-on-surface-variant">{m.relationship}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={busy}
                className="btn-ghost text-error hover:bg-error-container hover:text-on-error-container"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {quotaError ? (
        <UpgradeModal
          error={quotaError}
          onClose={() => setQuotaError(null)}
          onUpgraded={() => setQuotaError(null)}
        />
      ) : null}
    </div>
  );
}

import { headers } from "next/headers";
import { RecallChecker } from "@/components/RecallChecker";

type Meta = {
  lastSyncedAt: string | null;
  recallCount: number;
  ndcCount: number;
};

async function fetchMeta(): Promise<Meta | null> {
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (!host) return null;
    const res = await fetch(`${proto}://${host}/api/meta`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Meta;
  } catch {
    return null;
  }
}

export default async function Home() {
  const meta = await fetchMeta();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">药品召回查询</h1>
        <p className="mt-2 text-sm text-slate-600">
          基于 OpenFDA 数据,查询美国 FDA 是否对某款药品发起过召回。
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <RecallChecker />
      </section>

      <div className="mt-6 flex justify-between text-xs text-slate-500">
        <span>
          召回记录 {meta?.recallCount ?? 0} 条 · NDC 字典 {meta?.ndcCount ?? 0} 条
        </span>
        <span>
          数据最后同步:
          {meta?.lastSyncedAt ? new Date(meta.lastSyncedAt).toLocaleString() : "尚未同步"}
        </span>
      </div>
    </main>
  );
}

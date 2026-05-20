"use client";

import type { CheckRecallResult, RecallMatch } from "@/lib/check-recall";

type Props = {
  result: CheckRecallResult & { lastSyncedAt: string | null };
  onReset: () => void;
};

function classColor(c: string | null): string {
  if (!c) return "bg-slate-100 text-slate-800 border-slate-200";
  if (c.toLowerCase().includes("i") && !c.toLowerCase().includes("ii")) {
    return "bg-rose-100 text-rose-900 border-rose-300";
  }
  if (c.toLowerCase().includes("ii") && !c.toLowerCase().includes("iii")) {
    return "bg-amber-100 text-amber-900 border-amber-300";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function classLabel(c: string | null): string {
  if (!c) return "未分级";
  if (/class\s*i\b/i.test(c)) return "Class I — 严重风险";
  if (/class\s*ii\b/i.test(c)) return "Class II — 中度风险";
  if (/class\s*iii\b/i.test(c)) return "Class III — 轻微风险";
  return c;
}

function MatchCard({ m }: { m: RecallMatch }) {
  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-semibold ${classColor(m.classification)}`}
        >
          {classLabel(m.classification)}
        </span>
        {m.ndcExact ? (
          <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-800">
            NDC 精确命中
          </span>
        ) : null}
        {m.lotMatch === true ? (
          <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-800">
            批号匹配
          </span>
        ) : null}
        {m.lotMatch === false ? (
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
            批号未在召回范围
          </span>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">
          {m.status ?? ""} · {m.recallInitiationDate ?? ""}
        </span>
      </div>

      <div>
        <div className="font-medium text-slate-900">
          {m.brandName || m.genericName || m.productDescription || "(未命名)"}
        </div>
        {m.productDescription &&
        m.productDescription !== (m.brandName || m.genericName) ? (
          <div className="mt-1 text-xs text-slate-600">{m.productDescription}</div>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">召回原因</dt>
          <dd className="text-slate-900">{m.reasonForRecall ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">召回方</dt>
          <dd className="text-slate-900">{m.recallingFirm ?? "—"}</dd>
        </div>
        {m.codeInfo ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">批号信息(code_info)</dt>
            <dd className="whitespace-pre-wrap font-mono text-[11px] text-slate-800">
              {m.codeInfo}
            </dd>
          </div>
        ) : null}
        {m.productNdc && m.productNdc.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">涉及 NDC</dt>
            <dd className="font-mono text-[11px] text-slate-800">
              {m.productNdc.join(", ")}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
        召回编号:<span className="font-mono">{m.recallNumber}</span>
        {!m.ndcExact ? (
          <>
            {" "}· 产品匹配 {m.productScore.toFixed(2)} · 厂商匹配 {m.firmScore.toFixed(2)}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ResultPanel({ result, onReset }: Props) {
  const { status, matches, lastSyncedAt } = result;

  const header =
    status === "recalled" ? (
      <div className="rounded-md border-2 border-rose-300 bg-rose-50 p-4 text-rose-900">
        <div className="text-lg font-semibold">⚠ 已被召回</div>
        <p className="mt-1 text-sm">
          此药品(或同 NDC 药品)在 FDA 召回记录中存在匹配。请立即停止使用并联系药师/医生。
        </p>
      </div>
    ) : status === "possible" ? (
      <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-4 text-amber-900">
        <div className="text-lg font-semibold">? 可能匹配</div>
        <p className="mt-1 text-sm">
          找到了文本上接近的召回记录,但<strong>不能确定</strong>就是同一款产品。
          建议补充 NDC 与批号(可在药品包装上找到)后再次查询。
        </p>
      </div>
    ) : (
      <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <div className="text-lg font-semibold">✓ 未发现召回</div>
        {result.ndcSearched ? (
          <p className="mt-1 text-sm">
            你提供的 <strong>NDC</strong> 在召回数据库中没有匹配记录。
            想看同款药品其他厂商的召回情况?清空 NDC 字段重新查询即可。
          </p>
        ) : (
          <p className="mt-1 text-sm">
            当前数据库中没有匹配的召回记录。
            <strong>这不代表绝对安全</strong> — 仅代表本系统目前没有相关数据。
          </p>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      {header}

      {matches.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">
            匹配的召回记录 ({matches.length})
          </h3>
          {matches.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
        <span>
          数据最后同步:{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "尚未同步"}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
        >
          查另一个 ↻
        </button>
      </div>
    </div>
  );
}

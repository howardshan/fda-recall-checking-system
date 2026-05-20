export function Disclaimer() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
      查询结果仅供参考,<strong>不构成医疗建议</strong>。请以 FDA 官方信息及药师/医生意见为准。
      数据来源:<a href="https://open.fda.gov/" target="_blank" rel="noopener noreferrer" className="underline">OpenFDA</a>(美国 FDA),
      非美国市场药品不在数据范围内。
    </div>
  );
}

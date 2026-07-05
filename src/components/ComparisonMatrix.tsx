import type { Module } from '../lib/types';
import { bestPrice, bestSource, formatMoney } from '../lib/scoring';
import { criterionEvidence } from '../lib/evidence';
import Thumb from './Thumb';

/**
 * The comparison matrix is the page's primary artifact: every option of a module
 * as a row, every criterion as an *information* column showing the literal fact
 * (via criterionEvidence). No scores, no ranking, no "best" — just the sourced
 * values side by side. Options appear in their natural (seed) order. Clicking a
 * row opens the full product-detail page.
 */
export default function ComparisonMatrix({
  module,
  onOpenDetail,
}: {
  module: Module;
  onOpenDetail: (optionId: string) => void;
}) {
  if (module.options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
        No options in {module.label} yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-medium">Option</th>
            <th className="px-3 py-2 text-right font-medium">Best price</th>
            {module.criteria.map((c) => (
              <th key={c.id} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {module.options.map((o) => {
            const bsrc = bestSource(o);
            return (
              <tr
                key={o.id}
                onClick={() => onOpenDetail(o.id)}
                className="group cursor-pointer border-b border-slate-100 bg-white last:border-0 hover:bg-slate-50"
              >
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Thumb src={o.image} alt={o.name} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">{o.name || '(unnamed)'}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <span className="font-semibold tabular-nums text-slate-800">{formatMoney(bestPrice(o))}</span>
                  {bsrc && <div className="text-[11px] text-slate-400">{bsrc.retailer}</div>}
                </td>
                {module.criteria.map((c) => {
                  const ev = criterionEvidence(c, o);
                  return (
                    <td key={c.id} className="px-3 py-2 align-top">
                      <span
                        title={ev ?? undefined}
                        className="block max-w-[14rem] text-slate-600"
                      >
                        {ev ?? <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { Module, Option } from '../lib/types';
import { bestPrice, bestSource, formatMoney } from '../lib/scoring';
import { criterionEvidence } from '../lib/evidence';
import { criterionMetric } from '../lib/criterionMetric';
import Thumb from './Thumb';

/** A rendered column: how to display and how to sort one field across options. */
interface Col {
  key: string;
  label: string;
  align?: 'right';
  /** Display string for a cell (null → em dash). */
  text: (o: Option) => string | null;
  /** Sort value — number sorts numerically, string sorts alphabetically, null last. */
  sort: (o: Option) => number | string | null;
}

const isPriceCriterion = (id: string, label: string) => /price|cost/i.test(`${id} ${label}`);

/**
 * Information catalog for one module: every option a row, with a filter box and
 * click-to-sort columns. Columns are the module's data-bearing facts (the price
 * is shown once as "Best price"; criterion columns that no option has data for
 * are hidden). Long values are truncated to keep rows short — the full text is
 * on the drill-down page. No scores or ranking.
 */
export default function ComparisonMatrix({
  module,
  onOpenDetail,
}: {
  module: Module;
  onOpenDetail: (optionId: string) => void;
}) {
  const [query, setQuery] = useState('');
  // Default order is the natural (seed) order; a header click sets an explicit sort.
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const cols: Col[] = useMemo(() => {
    const out: Col[] = [];
    out.push({
      key: '_price',
      label: 'Best price',
      align: 'right',
      text: (o) => {
        const p = bestPrice(o);
        return p > 0 ? formatMoney(p) : null;
      },
      sort: (o) => {
        const p = bestPrice(o);
        return p > 0 ? p : null;
      },
    });

    if (module.id === 'adapter') {
      const attr = (key: string, label: string): Col => ({
        key,
        label,
        text: (o) => {
          const v = (o.attributes as Record<string, unknown>)[key];
          return v == null ? null : String(v);
        },
        sort: (o) => {
          const v = (o.attributes as Record<string, unknown>)[key];
          return v == null ? null : String(v).toLowerCase();
        },
      });
      out.push(attr('madeBy', 'Made by'), attr('seatBrands', 'Fits car seats'), attr('partNumber', 'Part #'));
    } else {
      for (const c of module.criteria) {
        if (isPriceCriterion(c.id, c.label)) continue; // "Best price" already covers it
        const hasData = module.options.some((o) => criterionEvidence(c, o) != null);
        if (!hasData) continue;
        out.push({
          key: c.id,
          label: c.label,
          text: (o) => criterionEvidence(c, o),
          sort: (o) => {
            const m = criterionMetric(c, o);
            if (m && typeof m.value === 'number' && !Number.isNaN(m.value)) return m.value;
            const ev = criterionEvidence(c, o);
            return ev ? ev.toLowerCase() : null;
          },
        });
      }
    }
    return out;
  }, [module]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = module.options;
    if (q) {
      list = list.filter((o) => {
        const hay = [o.name, ...cols.map((c) => c.text(o) ?? '')].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (sort) {
      const col = sort.key === '_name' ? null : cols.find((c) => c.key === sort.key);
      const val = (o: Option): number | string | null =>
        sort.key === '_name' ? o.name.toLowerCase() : col ? col.sort(o) : null;
      list = [...list].sort((a, b) => {
        const va = val(a);
        const vb = val(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1; // missing values always sort last
        if (vb == null) return -1;
        const cmp =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb));
        return cmp * sort.dir;
      });
    }
    return list;
  }, [module.options, cols, query, sort]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const arrow = (key: string) => (sort?.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : '');

  if (module.options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
        No options in {module.label} yet.
      </p>
    );
  }

  const headCls = 'cursor-pointer select-none px-3 py-1.5 font-medium hover:text-slate-800';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter ${module.options.length} ${module.label.toLowerCase()}…`}
          className="w-64 max-w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
        />
        <span className="text-xs text-slate-400">
          {rows.length} of {module.options.length}
          {sort && (
            <button onClick={() => setSort(null)} className="ml-2 text-indigo-500 hover:underline">
              clear sort
            </button>
          )}
        </span>
      </div>

      <div className="w-fit max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className={`sticky left-0 z-10 bg-slate-50 ${headCls}`} onClick={() => toggleSort('_name')}>
                Option{arrow('_name')}
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`${headCls} ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.label}
                  {arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const bsrc = bestSource(o);
              return (
                <tr
                  key={o.id}
                  onClick={() => onOpenDetail(o.id)}
                  className="cursor-pointer border-b border-slate-100 bg-white last:border-0 hover:bg-slate-50"
                >
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Thumb src={o.image} alt={o.name} size="xs" />
                      <div className="max-w-[15rem] truncate font-medium text-slate-800">{o.name || '(unnamed)'}</div>
                    </div>
                  </td>
                  {cols.map((c) => {
                    const t = c.text(o);
                    const priceCol = c.key === '_price';
                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-1.5 align-middle ${c.align === 'right' ? 'whitespace-nowrap text-right' : ''}`}
                      >
                        <span
                          title={t ?? undefined}
                          className={`block truncate ${c.align === 'right' ? '' : 'max-w-[13rem]'} ${
                            priceCol ? 'font-semibold tabular-nums text-slate-800' : 'text-slate-600'
                          }`}
                        >
                          {t ?? <span className="text-slate-300">—</span>}
                        </span>
                        {priceCol && bsrc && <div className="text-[11px] text-slate-400">{bsrc.retailer}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

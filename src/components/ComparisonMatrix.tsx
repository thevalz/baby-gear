import { useMemo, useState } from 'react';
import type { Module, Option } from '../lib/types';
import { bestPrice, bestSource, formatMoney } from '../lib/scoring';
import { criterionEvidence } from '../lib/evidence';
import { criterionMetric } from '../lib/criterionMetric';
import { useSessionState } from '../lib/useSessionState';
import Thumb from './Thumb';
import Lightbox from './Lightbox';
import SafetyInfo from './SafetyInfo';

/** Best link to where an option's image / data came from. */
const imageSource = (o: Option): string | undefined =>
  (o.attributes as Record<string, unknown>).sourceUrl as string | undefined ??
  bestSource(o)?.url ??
  o.priceSources?.[0]?.url;

/** A rendered column: how to display and how to sort one field across options. */
interface Col {
  key: string;
  label: string;
  align?: 'right';
  /** Display string for a cell (null → em dash). */
  text: (o: Option) => string | null;
  /** Sort value — number sorts numerically, string alphabetically, null last. */
  sort: (o: Option) => number | string | null;
}

const attr = (o: Option, key: string): unknown => (o.attributes as Record<string, unknown>)[key];

/** Numeric column: header carries the unit, the cell shows the bare number (tight + sortable). */
function numCol(key: string, label: string, unit: string): Col {
  return {
    key,
    label: `${label} (${unit})`,
    align: 'right',
    text: (o) => {
      const v = attr(o, key);
      return typeof v === 'number' ? String(v) : null;
    },
    sort: (o) => {
      const v = attr(o, key);
      return typeof v === 'number' ? v : null;
    },
  };
}

/** Text column. */
function strCol(key: string, label: string): Col {
  return {
    key,
    label,
    text: (o) => {
      const v = attr(o, key);
      return v == null || v === '' ? null : String(v);
    },
    sort: (o) => {
      const v = attr(o, key);
      return v == null || v === '' ? null : String(v).toLowerCase();
    },
  };
}

const priceCol: Col = {
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
};

/** Factual safety summary: recall status + certifications + harness (see the ⓘ explainer). */
const safetyCol: Col = {
  key: 'safety',
  label: 'Safety',
  text: (o) => (attr(o, 'safetySummary') as string | undefined) ?? null,
  // Recall-free sorts first, then unknown, then recalled last.
  sort: (o) => {
    const r = attr(o, 'safetyRecall');
    return r === 'recalled' ? 2 : r === 'unknown' ? 1 : 0;
  },
};

/** Suspension: the named system (BOBs) or "Yes" when the tire text mentions suspension. */
const suspensionCol: Col = {
  key: 'suspension',
  text: (o) => {
    const s = attr(o, 'suspension');
    if (s) return String(s);
    const t = attr(o, 'tires');
    return typeof t === 'string' && /suspension/i.test(t) ? 'Yes' : null;
  },
  sort: (o) => suspensionCol.text(o)?.toLowerCase() ?? null,
  label: 'Suspension',
};

const isPriceCriterion = (id: string, label: string) => /price|cost/i.test(`${id} ${label}`);

/** The column set for a module. Each captured dimension is its own sortable column. */
function columnsFor(module: Module): Col[] {
  let cols: Col[];
  if (module.id === 'stroller') {
    // Ordered by what matters most to a parent choosing a stroller: budget and
    // portability first (price, weight, type, folded size), then capacity /
    // everyday usability, then ride, then the less-differentiating footprint,
    // brand, adapter, and (mostly-uniform) safety-standard columns.
    cols = [
      priceCol,
      numCol('weightLb', 'Weight', 'lb'),
      strCol('type', 'Type'),
      numCol('foldLenIn', 'Fold L', 'in'),
      numCol('foldWidIn', 'Fold W', 'in'),
      numCol('foldHtIn', 'Fold H', 'in'),
      numCol('maxChildLb', 'Max child', 'lb'),
      strCol('recline', 'Recline'),
      strCol('foldType', 'Fold'),
      suspensionCol,
      strCol('tires', 'Tires'),
      strCol('brakeType', 'Brake'),
      safetyCol,
      numCol('openLenIn', 'Open L', 'in'),
      numCol('openWidIn', 'Open W', 'in'),
      numCol('openHtIn', 'Open H', 'in'),
      strCol('brand', 'Brand'),
      strCol('adapterSystem', 'Clek adapter'),
    ];
  } else if (module.id === 'adapter') {
    cols = [
      strCol('madeBy', 'Made by'),
      strCol('partNumber', 'Part #'),
      strCol('seatBrands', 'Fits car seats'),
      priceCol,
      {
        key: 'discontinued',
        label: 'Status',
        text: (o) => (attr(o, 'discontinued') ? 'Discontinued' : 'Available'),
        sort: (o) => (attr(o, 'discontinued') ? 1 : 0),
      },
    ];
  } else {
    // Car seats etc.: one column per (non-price) criterion, showing its literal value.
    cols = [priceCol];
    for (const c of module.criteria) {
      if (isPriceCriterion(c.id, c.label)) continue;
      cols.push({
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
  // Drop any column no option has data for.
  return cols.filter((c) => c.key === '_price' || module.options.some((o) => c.text(o) != null));
}

/**
 * Information catalog for one module: every option a row, a filter box, and
 * click-to-sort columns — one column per captured dimension (weight, each
 * folded/unfolded measurement, brake, capacity, price, …) so any single field
 * can be sorted or filtered. Long text truncates; the full record is on the
 * drill-down. No scores or ranking.
 */
export default function ComparisonMatrix({
  module,
  onOpenDetail,
}: {
  module: Module;
  onOpenDetail: (optionId: string) => void;
}) {
  // Sort + filter persist per module for the browser-tab session (survive tab
  // switches, detail↔back, and reloads).
  const [query, setQuery] = useSessionState(`matrix:${module.id}:query`, '');
  const [sort, setSort] = useSessionState<{ key: string; dir: 1 | -1 } | null>(
    `matrix:${module.id}:sort`,
    null,
  );
  const [zoom, setZoom] = useState<Option | null>(null);
  const [showSafety, setShowSafety] = useState(false);

  const cols = useMemo(() => columnsFor(module), [module]);

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
        if (va == null) return 1;
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

  const headCls = 'cursor-pointer select-none whitespace-nowrap px-3 py-1.5 font-medium hover:text-slate-800';

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
                  {c.key === 'safety' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSafety(true);
                      }}
                      title="About stroller safety"
                      aria-label="About stroller safety"
                      className="ml-1 font-semibold text-indigo-500 hover:text-indigo-700"
                    >
                      ⓘ
                    </button>
                  )}
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
                      {o.image ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoom(o);
                          }}
                          className="cursor-zoom-in"
                          aria-label={`Enlarge ${o.name} image`}
                          title="Click to enlarge"
                        >
                          <Thumb src={o.image} alt={o.name} size="xs" />
                        </button>
                      ) : (
                        <Thumb src={o.image} alt={o.name} size="xs" />
                      )}
                      <div className="max-w-[14rem] truncate font-medium text-slate-800">{o.name || '(unnamed)'}</div>
                    </div>
                  </td>
                  {cols.map((c) => {
                    const t = c.text(o);
                    const priceColumn = c.key === '_price';
                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-1.5 align-middle ${c.align === 'right' ? 'whitespace-nowrap text-right tabular-nums' : ''}`}
                      >
                        <span
                          title={t ?? undefined}
                          className={`block ${c.align === 'right' ? '' : 'max-w-[11rem] truncate'} ${
                            priceColumn ? 'font-semibold text-slate-800' : 'text-slate-600'
                          }`}
                        >
                          {t ?? <span className="text-slate-300">—</span>}
                        </span>
                        {priceColumn && bsrc && <div className="text-[11px] text-slate-400">{bsrc.retailer}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {zoom && (
        <Lightbox
          src={zoom.image}
          alt={zoom.name}
          sourceUrl={imageSource(zoom)}
          onClose={() => setZoom(null)}
        />
      )}

      {showSafety && <SafetyInfo onClose={() => setShowSafety(false)} />}
    </div>
  );
}

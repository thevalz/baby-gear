import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Module, Option } from '../lib/types';
import { useStore } from '../lib/store';
import {
  bestPrice,
  bestSource,
  formatMoney,
  formatPercent,
  maxScore,
  percent,
  topPick,
  weightedTotal,
} from '../lib/scoring';
import { optionSummary, type SummaryChip } from '../lib/evidence';
import {
  overallRanks,
  percentileLabel,
  rankLabel,
  rankTier,
  type RankTier,
} from '../lib/ranking';
import { moduleTags, optionMatchesTags, tagHint, tagIcon, tagLabel } from '../lib/tags';
import Thumb from './Thumb';

const clampScore = (v: number) => Math.max(0, Math.min(5, v));
const clampWeight = (v: number) => Math.max(1, Math.min(5, v));

const CHIP_TONE: Record<SummaryChip['tone'], string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  bad: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

/** Colour for the field-rank badge, by tier. */
const RANK_TIER_STYLE: Record<RankTier, string> = {
  top: 'bg-emerald-100 text-emerald-700',
  mid: 'bg-slate-100 text-slate-600',
  weak: 'bg-amber-100 text-amber-700',
};

const numInput = 'rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums';
const textInput = 'rounded-md border border-slate-300 px-2 py-1';

/** Editable list of sourced retailer prices for one option (the engine's data). */
function PriceSourcesEditor({ module, option }: { module: Module; option: Option }) {
  const addPriceSource = useStore((s) => s.addPriceSource);
  const updatePriceSource = useStore((s) => s.updatePriceSource);
  const deletePriceSource = useStore((s) => s.deletePriceSource);
  const updateOption = useStore((s) => s.updateOption);
  const sources = option.priceSources ?? [];
  const best = bestSource(option);

  return (
    <div className="space-y-3">
      {/* Image path */}
      <label className="flex items-center gap-2 text-xs text-slate-500">
        Image path
        <input
          value={option.image ?? ''}
          placeholder="images/my-product.jpg"
          onChange={(e) => updateOption(module.id, option.id, { image: e.target.value })}
          className={`w-72 ${textInput}`}
        />
        <span className="text-slate-400">(relative to public/)</span>
      </label>

      {/* Reference price */}
      <label className="flex items-center gap-2 text-xs text-slate-500">
        Reference price <span className="text-slate-400">$</span>
        <input
          type="number"
          min={0}
          step={10}
          value={option.price}
          onChange={(e) => updateOption(module.id, option.id, { price: Number(e.target.value) || 0 })}
          className={`w-24 ${numInput}`}
        />
        <span className="text-slate-400">used when no in-stock source exists</span>
      </label>

      {/* Sources table */}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-2 py-1 text-left font-medium">Retailer</th>
              <th className="px-2 py-1 text-right font-medium">Price</th>
              <th className="px-2 py-1 text-left font-medium">URL</th>
              <th className="px-2 py-1 text-center font-medium">In stock</th>
              <th className="px-2 py-1 text-left font-medium">Checked</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {sources.map((src, i) => {
              const isBest = best != null && src === best;
              return (
                <tr key={i} className={`border-t border-slate-100 ${isBest ? 'bg-emerald-50' : ''}`}>
                  <td className="px-2 py-1">
                    <input
                      value={src.retailer}
                      placeholder="Amazon"
                      onChange={(e) => updatePriceSource(module.id, option.id, i, { retailer: e.target.value })}
                      className={`w-28 ${textInput}`}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={src.price}
                      onChange={(e) => updatePriceSource(module.id, option.id, i, { price: Number(e.target.value) || 0 })}
                      className={`w-20 ${numInput}`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={src.url}
                      placeholder="https://…"
                      onChange={(e) => updatePriceSource(module.id, option.id, i, { url: e.target.value })}
                      className={`w-64 ${textInput}`}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={src.inStock !== false}
                      onChange={(e) => updatePriceSource(module.id, option.id, i, { inStock: e.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="date"
                      value={src.checkedAt}
                      onChange={(e) => updatePriceSource(module.id, option.id, i, { checkedAt: e.target.value })}
                      className={textInput}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => deletePriceSource(module.id, option.id, i)}
                      title="Remove source"
                      className="text-slate-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {sources.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-2 text-slate-400">
                  No sourced prices yet — add one, or let a research session populate them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => addPriceSource(module.id, option.id)}
        className="rounded-md border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        + price source
      </button>
    </div>
  );
}

/**
 * What the options table is sorted by: a special column key or a criterion id
 * (so every rating column is sortable too).
 */
type SortKey = 'name' | 'price' | 'rank' | 'weighted' | 'percent' | (string & {});
interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

/** A clickable column header that sorts the options table and shows the direction. */
function SortHeader({
  sortKey,
  sort,
  onSort,
  align = 'center',
  children,
}: {
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'center' | 'right';
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  const justify =
    align === 'right' ? 'justify-end' : align === 'left' ? 'justify-start' : 'justify-center';
  return (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title="Sort by this column"
        className={`inline-flex w-full items-center gap-1 ${justify} hover:text-slate-700`}
      >
        {children}
        <span className={`text-[10px] ${active ? 'text-indigo-600' : 'text-slate-300'}`}>
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  );
}

export default function ModuleView({
  module,
  onDeleted,
  onOpenDetail,
}: {
  module: Module;
  onDeleted: () => void;
  onOpenDetail: (optionId: string) => void;
}) {
  const setModuleLabel = useStore((s) => s.setModuleLabel);
  const setModuleBudget = useStore((s) => s.setModuleBudget);
  const deleteModule = useStore((s) => s.deleteModule);
  const addCriterion = useStore((s) => s.addCriterion);
  const updateCriterion = useStore((s) => s.updateCriterion);
  const deleteCriterion = useStore((s) => s.deleteCriterion);
  const addOption = useStore((s) => s.addOption);
  const updateOption = useStore((s) => s.updateOption);
  const deleteOption = useStore((s) => s.deleteOption);
  const setScore = useStore((s) => s.setScore);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Default to the ranked view (#1 first); clicking any column header re-sorts.
  // Rank/name/price start ascending, the rest (scores, %) high→low.
  const [sort, setSort] = useState<SortState>({ key: 'rank', dir: 'asc' });
  // Navigability filters: free-text name search + AND-combined tag chips.
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const max = maxScore(module.criteria);
  const best = topPick(module);
  // Standing of every option across the whole field (independent of any filter).
  const ranks = useMemo(() => overallRanks(module), [module]);
  const availableTags = useMemo(() => moduleTags(module), [module]);
  const ascByDefault = (key: SortKey) => key === 'name' || key === 'price' || key === 'rank';
  const onSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: ascByDefault(key) ? 'asc' : 'desc' },
    );

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const sortedOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = module.options.filter(
      (o) =>
        (q === '' || (o.name || '').toLowerCase().includes(q)) &&
        optionMatchesTags(o, selectedTags),
    );
    const value = (o: Option): number | string => {
      if (sort.key === 'name') return (o.name || '').toLowerCase();
      if (sort.key === 'price') return bestPrice(o);
      if (sort.key === 'rank') return ranks[o.id]?.rank ?? Infinity;
      if (sort.key === 'weighted') return weightedTotal(o, module.criteria);
      if (sort.key === 'percent') return percent(o, module.criteria);
      return o.scores[sort.key] ?? 0; // a criterion id → its 0–5 rating
    };
    return filtered.sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp =
        typeof av === 'string' || typeof bv === 'string'
          ? String(av).localeCompare(String(bv))
          : av - bv;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [module.options, module.criteria, sort, query, selectedTags, ranks]);

  const chartData = module.options.map((o) => ({
    name: o.name || '(unnamed)',
    score: weightedTotal(o, module.criteria),
    isTop: best?.id === o.id,
  }));

  const colSpan = module.criteria.length + 7;
  const filteredCount = sortedOptions.length;
  const totalCount = module.options.length;
  const filtersActive = query.trim() !== '' || selectedTags.size > 0;

  return (
    <div className="space-y-6">
      {/* Header: editable label + budget */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={module.label}
          onChange={(e) => setModuleLabel(module.id, e.target.value)}
          className="rounded-md border border-transparent px-1 text-xl font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-300"
        />
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <label className="flex items-center gap-1">
            Budget <span className="text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step={50}
              value={module.budget}
              onChange={(e) => setModuleBudget(module.id, Number(e.target.value) || 0)}
              className={`w-28 ${numInput}`}
            />
          </label>
          <span>Max score {max}</span>
          <button
            onClick={() => {
              if (confirm(`Delete the "${module.label}" module?`)) {
                deleteModule(module.id);
                onDeleted();
              }
            }}
            className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
          >
            Delete module
          </button>
        </div>
      </header>

      {/* Criteria editor */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-600">Criteria & weights</h3>
        <div className="flex flex-wrap gap-2">
          {module.criteria.map((c) => (
            <div key={c.id} className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              <input
                value={c.label}
                onChange={(e) => updateCriterion(module.id, c.id, { label: e.target.value })}
                className={`w-40 ${textInput}`}
              />
              <span className="text-slate-400">×</span>
              <input
                type="number"
                min={1}
                max={5}
                value={c.weight}
                onChange={(e) => updateCriterion(module.id, c.id, { weight: clampWeight(Number(e.target.value) || 1) })}
                className={`w-14 ${numInput}`}
              />
              <button
                onClick={() => deleteCriterion(module.id, c.id)}
                title="Remove criterion"
                className="px-1 text-slate-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => addCriterion(module.id)}
            className="rounded-md border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            + criterion
          </button>
        </div>
        {module.criteria.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">Add at least one criterion to start scoring options.</p>
        )}
      </section>

      {/* Filter / navigate the field: name search + material/cert tag chips */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">🔎</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${module.label.toLowerCase()}…`}
              className={`w-56 ${textInput}`}
            />
          </label>

          {availableTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-slate-400">Tags</span>
              {availableTags.map((t) => {
                const on = selectedTags.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    title={tagHint(t)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 transition ${
                      on
                        ? 'bg-lime-600 text-white ring-lime-600'
                        : 'bg-lime-50 text-lime-800 ring-lime-200 hover:bg-lime-100'
                    }`}
                  >
                    <span aria-hidden>{tagIcon(t)}</span>
                    {tagLabel(t)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
            <span>
              {filtersActive ? `${filteredCount} of ${totalCount}` : `${totalCount}`} option
              {totalCount === 1 ? '' : 's'}
            </span>
            {filtersActive && (
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedTags(new Set());
                }}
                className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        {availableTags.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            No material/certification tags sourced for this category yet (e.g. non-toxic,
            flame-retardant-free, GREENGUARD Gold). A sourcing pass can add them.
          </p>
        )}
      </section>

      {/* Options table (editable) */}
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <SortHeader sortKey="name" sort={sort} onSort={onSort} align="left">
                Option
              </SortHeader>
              <th className="px-3 py-2 text-left font-medium">Key facts</th>
              <SortHeader sortKey="price" sort={sort} onSort={onSort} align="right">
                Best price
              </SortHeader>
              <SortHeader sortKey="rank" sort={sort} onSort={onSort} align="center">
                Rank
              </SortHeader>
              {module.criteria.map((c) => (
                <SortHeader key={c.id} sortKey={c.id} sort={sort} onSort={onSort} align="center">
                  {c.label}
                  <span className="ml-1 text-xs font-semibold text-indigo-600">×{c.weight}</span>
                </SortHeader>
              ))}
              <SortHeader sortKey="weighted" sort={sort} onSort={onSort} align="right">
                Weighted
              </SortHeader>
              <SortHeader sortKey="percent" sort={sort} onSort={onSort} align="right">
                %
              </SortHeader>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {sortedOptions.map((o) => {
              const isTop = best?.id === o.id;
              const expanded = expandedId === o.id;
              const price = bestPrice(o);
              const bsrc = bestSource(o);
              const nSources = (o.priceSources ?? []).length;
              return (
                <Fragment key={o.id}>
                  <tr className={`border-b border-slate-100 ${expanded ? '' : 'last:border-0'} ${isTop ? 'bg-indigo-50' : ''}`}>
                    <td className={`px-3 py-2 border-l-4 ${isTop ? 'border-indigo-500' : 'border-transparent'}`}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenDetail(o.id)}
                          title="View product details"
                          className="rounded-md hover:ring-2 hover:ring-indigo-300"
                        >
                          <Thumb src={o.image} alt={o.name} />
                        </button>
                        <div className="flex flex-col">
                          {isTop && (
                            <span className="mb-0.5 self-start rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                              Top pick
                            </span>
                          )}
                          <input
                            value={o.name}
                            onChange={(e) => updateOption(module.id, o.id, { name: e.target.value })}
                            className={`w-44 ${textInput} font-medium text-slate-800`}
                          />
                          <button
                            onClick={() => onOpenDetail(o.id)}
                            className="mt-0.5 self-start text-xs text-indigo-600 hover:underline"
                          >
                            View details →
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex max-w-[15rem] flex-wrap gap-1">
                        {optionSummary(o).map((chip) => (
                          <span
                            key={chip.key}
                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${CHIP_TONE[chip.tone]}`}
                          >
                            {chip.text}
                          </span>
                        ))}
                        {(o.tags ?? []).map((t) => (
                          <span
                            key={t}
                            title={tagHint(t)}
                            className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-lime-50 px-2 py-0.5 text-xs font-medium text-lime-800 ring-1 ring-lime-200"
                          >
                            <span aria-hidden>{tagIcon(t)}</span>
                            {tagLabel(t)}
                          </span>
                        ))}
                        {optionSummary(o).length === 0 && (o.tags ?? []).length === 0 && (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setExpandedId(expanded ? null : o.id)}
                        className="inline-flex flex-col items-end rounded-md px-2 py-1 hover:bg-slate-100"
                        title="Edit price sources & image"
                      >
                        <span className="font-semibold tabular-nums text-slate-800">{formatMoney(price)}</span>
                        <span className="text-xs text-slate-400">
                          {bsrc ? `${bsrc.retailer} · ` : ''}
                          {nSources > 0 ? `${nSources} source${nSources > 1 ? 's' : ''} ` : 'no sources '}
                          {expanded ? '▴' : '▾'}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        const r = ranks[o.id];
                        if (!r) return <span className="text-slate-300">—</span>;
                        return (
                          <span
                            title={`${percentileLabel(r.percentile)} percentile of ${r.of}`}
                            className={`inline-flex flex-col items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${RANK_TIER_STYLE[rankTier(r)]}`}
                          >
                            <span>{rankLabel(r)}</span>
                            <span className="text-[10px] font-normal opacity-75">
                              {percentileLabel(r.percentile)} pct
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                    {module.criteria.map((c) => (
                      <td key={c.id} className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={o.scores[c.id] ?? 0}
                          onChange={(e) => setScore(module.id, o.id, c.id, clampScore(Number(e.target.value) || 0))}
                          className={`w-14 ${numInput} text-center`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {weightedTotal(o, module.criteria)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {formatPercent(percent(o, module.criteria))}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => deleteOption(module.id, o.id)}
                        title="Delete option"
                        className="text-slate-400 hover:text-red-600"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-slate-100 last:border-0 bg-slate-50/60">
                      <td colSpan={colSpan} className="px-3 py-3">
                        <PriceSourcesEditor module={module} option={o} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {module.options.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-3 text-slate-400">
                  No options yet — add one below.
                </td>
              </tr>
            )}
            {module.options.length > 0 && sortedOptions.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-3 text-slate-400">
                  No options match the current filters.{' '}
                  <button
                    onClick={() => {
                      setQuery('');
                      setSelectedTags(new Set());
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => addOption(module.id)}
            className="rounded-md border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            + Add option
          </button>
        </div>
      </section>

      {/* Chart */}
      {module.options.length > 0 && module.criteria.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-600">Weighted total by option (max {max})</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, module.options.length * 48)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, max]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.isTop ? '#4f46e5' : '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}

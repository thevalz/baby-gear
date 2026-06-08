import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Criterion, Module, Option } from '../lib/types';
import {
  bestPrice,
  bestSource,
  formatMoney,
  formatPercent,
  maxScore,
  percent,
  rankedOptions,
  topPick,
  weightedTotal,
} from '../lib/scoring';
import { criterionEvidence } from '../lib/evidence';
import { criterionMetric, metricFails, metricMargin, type MetricContext } from '../lib/criterionMetric';
import { useStore } from '../lib/store';
import Thumb from './Thumb';

/**
 * The comparison matrix is the summary page's primary artifact: every option of
 * a module as a row, every requirement as a *real-value* column (the literal
 * fact behind the score, via criterionEvidence), best-in-column subtly shaded.
 * No opaque score column — only a weighted "match". Clicking a row opens an
 * anchored-value popover (the per-requirement breakdown), which can expand to
 * the full product-detail page.
 */
export default function ComparisonMatrix({
  module,
  onOpenDetail,
}: {
  module: Module;
  onOpenDetail: (optionId: string) => void;
}) {
  const [popover, setPopover] = useState<{ option: Option; rect: DOMRect } | null>(null);
  const backSeatLengthIn = useStore((s) => s.preferences.backSeatLengthIn);

  const ranked = rankedOptions(module);
  const best = topPick(module);
  const max = maxScore(module.criteria);
  // Personal limits this matrix checks values against: the visitor's back-seat
  // length (rear-facing fit) and the module's own budget (price).
  const ctx: MetricContext = { backSeatLengthIn, budget: module.budget };

  // Best (highest) score per criterion — drives the heat shading. The score is
  // never shown; it only decides which real value to tint as "best in column".
  const colMax: Record<string, number> = {};
  module.criteria.forEach((c) => {
    colMax[c.id] = module.options.reduce((m, o) => Math.max(m, o.scores[c.id] ?? 0), 0);
  });

  if (ranked.length === 0) {
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
                <span className="ml-1 font-semibold text-indigo-500">×{c.weight}</span>
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Match</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((o) => {
            const isTop = best?.id === o.id;
            const bsrc = bestSource(o);
            return (
              <tr
                key={o.id}
                onClick={(e) =>
                  setPopover({ option: o, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })
                }
                className={`group cursor-pointer border-b border-slate-100 last:border-0 ${
                  isTop ? 'bg-indigo-50 hover:bg-indigo-100/70' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <td
                  className={`sticky left-0 z-10 border-l-4 bg-inherit px-3 py-2 ${
                    isTop ? 'border-indigo-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Thumb src={o.image} alt={o.name} />
                    <div className="min-w-0">
                      {isTop && (
                        <span className="mb-0.5 inline-block rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                          Top pick
                        </span>
                      )}
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
                  const score = o.scores[c.id] ?? 0;
                  const metric = criterionMetric(c, o, ctx);
                  const failed = metric ? metricFails(metric) : false;
                  // A fail (over the visitor's limit) overrides best-in-column heat.
                  const isBest = !failed && colMax[c.id] > 0 && score === colMax[c.id];
                  const failTitle =
                    failed && metric?.threshold
                      ? `${metric.threshold.label}: ${metricMargin(metric)}`
                      : undefined;
                  return (
                    <td key={c.id} className="px-3 py-2 align-top">
                      <span
                        title={failTitle ?? ev ?? undefined}
                        className={`block max-w-[12rem] truncate rounded px-1.5 py-0.5 ${
                          failed
                            ? 'bg-red-50 font-medium text-red-700'
                            : isBest
                              ? 'bg-emerald-50 font-medium text-emerald-800'
                              : 'text-slate-600'
                        }`}
                      >
                        {ev ?? <span className="text-slate-300">—</span>}
                        {failed && <span className="ml-1 font-semibold text-red-600">✗</span>}
                      </span>
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <div className="font-semibold tabular-nums text-indigo-600">
                    {formatPercent(percent(o, module.criteria))}
                  </div>
                  <div className="text-[11px] tabular-nums text-slate-400">
                    {weightedTotal(o, module.criteria)}/{max}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {popover && (
        <AnchoredValuePopover
          module={module}
          option={popover.option}
          rect={popover.rect}
          ctx={ctx}
          onClose={() => setPopover(null)}
          onShowMore={() => {
            const id = popover.option.id;
            setPopover(null);
            onOpenDetail(id);
          }}
        />
      )}
    </div>
  );
}

/** Header line shared by both row variants: criterion label + the literal value. */
function RowHeader({
  criterion,
  evidence,
  score,
}: {
  criterion: Criterion;
  evidence: string | null;
  score: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-500">
        {criterion.label} <span className="text-slate-300">·×{criterion.weight}</span>
      </span>
      <span className="text-sm font-semibold text-slate-800">
        {evidence ?? <span className="font-normal text-slate-300">— see notes</span>}
        <span className="ml-1.5 text-[11px] font-medium text-slate-400">{score}/5</span>
      </span>
    </div>
  );
}

/**
 * One requirement's value plotted on the real cohort range. For numeric criteria
 * this is the actual measurement against every sibling's measurement, with the
 * visitor's threshold marked (back-seat length, budget) and a pass/fail margin.
 * Non-numeric criteria (compat, safety, longevity) fall back to a 0–5 strip.
 */
function AnchoredRow({
  criterion,
  option,
  module,
  ctx,
}: {
  criterion: Criterion;
  option: Option;
  module: Module;
  ctx: MetricContext;
}) {
  const score = option.scores[criterion.id] ?? 0;
  const evidence = criterionEvidence(criterion, option);
  const metric = criterionMetric(criterion, option, ctx);

  // ── Fallback: no numeric metric → position by 0–5 score among siblings. ──
  if (!metric) {
    const siblings = module.options.map((o) => o.scores[criterion.id] ?? 0);
    const bestScore = siblings.reduce((m, s) => Math.max(m, s), 0);
    const isBest = score > 0 && score === bestScore;
    const pos = (score / 5) * 100;
    return (
      <div className="border-b border-slate-100 py-2 last:border-0">
        <RowHeader criterion={criterion} evidence={evidence} score={score} />
        <div className="relative mt-2 h-2 rounded-full bg-slate-100">
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${isBest ? 'bg-emerald-400' : 'bg-indigo-400'}`}
            style={{ width: `${pos}%` }}
          />
          {siblings.map((s, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300"
              style={{ left: `${(s / 5) * 100}%` }}
            />
          ))}
          <span
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${
              isBest ? 'bg-emerald-500 ring-1 ring-emerald-500' : 'bg-indigo-500 ring-1 ring-indigo-500'
            }`}
            style={{ left: `${pos}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>weak</span>
          {isBest ? <span className="font-semibold text-emerald-600">best in class</span> : <span />}
          <span>strong</span>
        </div>
      </div>
    );
  }

  // ── Numeric: plot the real value on the cohort range, vs the visitor's limit. ──
  const peers = module.options
    .map((o) => criterionMetric(criterion, o, ctx))
    .filter((m): m is NonNullable<typeof m> => m != null)
    .map((m) => m.value);
  const thr = metric.threshold;
  const lo = Math.min(...peers, thr ? thr.value : Infinity);
  const hi = Math.max(...peers, thr ? thr.value : -Infinity);
  const span = hi - lo || 1;
  const posOf = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  const pos = posOf(metric.value);
  const goodLeft = metric.dir < 0; // lower-is-better → good end on the left
  const failed = metricFails(metric);
  const margin = metricMargin(metric);

  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <RowHeader criterion={criterion} evidence={evidence} score={score} />
      <div className="relative mt-2 h-2 rounded-full bg-slate-100">
        {/* Tint from the "good" end up to this option's mark. */}
        <span
          className={`absolute inset-y-0 rounded-full ${failed ? 'bg-red-300' : 'bg-emerald-300'}`}
          style={goodLeft ? { left: 0, width: `${pos}%` } : { left: `${pos}%`, right: 0 }}
        />
        {/* The rest of the field as ghost dots. */}
        {peers.map((v, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300"
            style={{ left: `${posOf(v)}%` }}
          />
        ))}
        {/* The visitor's threshold line. */}
        {thr && (
          <span
            title={thr.label}
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 bg-amber-500"
            style={{ left: `${posOf(thr.value)}%` }}
          />
        )}
        {/* This option. */}
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ring-1 ${
            failed ? 'bg-red-500 ring-red-500' : 'bg-indigo-600 ring-indigo-600'
          }`}
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-[10px] text-slate-400">
        <span>{metric.format(lo)}</span>
        {thr ? (
          <span className={failed ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
            {failed ? '✗ ' : '✓ '}
            {margin} <span className="font-normal text-amber-600">vs {thr.label}</span>
          </span>
        ) : (
          <span />
        )}
        <span>{metric.format(hi)}</span>
      </div>
    </div>
  );
}

/** Floating, row-anchored breakdown of one option's per-requirement values. */
function AnchoredValuePopover({
  module,
  option,
  rect,
  ctx,
  onClose,
  onShowMore,
}: {
  module: Module;
  option: Option;
  rect: DOMRect;
  ctx: MetricContext;
  onClose: () => void;
  onShowMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number; maxHeight: number }>({
    top: rect.bottom + 6,
    left: rect.left,
    maxHeight: 440,
  });

  // Position under the clicked row, clamped to the viewport.
  useLayoutEffect(() => {
    const W = 360;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(8, rect.left), vw - W - 8);
    const maxHeight = Math.min(440, vh - 16);
    const top = Math.min(Math.max(8, rect.bottom + 6), vh - maxHeight - 8);
    setStyle({ top, left, maxHeight });
  }, [rect]);

  // Dismiss on Esc, or when the page scrolls/resizes (fixed coords go stale).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-label={`${option.name} value breakdown`}
        className="fixed z-50 flex w-[360px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ top: style.top, left: style.left, maxHeight: style.maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
          <Thumb src={option.image} alt={option.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-800">{option.name || '(unnamed)'}</div>
            <div className="text-xs text-slate-500">
              {formatMoney(bestPrice(option))} ·{' '}
              <span className="font-medium text-indigo-600">
                {formatPercent(percent(option, module.criteria))} match
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">
          {module.criteria.length === 0 ? (
            <p className="py-3 text-sm text-slate-400">No requirements defined yet.</p>
          ) : (
            module.criteria.map((c) => (
              <AnchoredRow key={c.id} criterion={c} option={option} module={module} ctx={ctx} />
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-2.5">
          <button
            onClick={onShowMore}
            className="w-full rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Show more — full product detail →
          </button>
        </div>
      </div>
    </>
  );
}

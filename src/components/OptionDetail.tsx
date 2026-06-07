import type { Module, Option } from '../lib/types';
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
import { criterionEvidence, optionFacts } from '../lib/evidence';
import { useStore } from '../lib/store';
import Thumb from './Thumb';

const card = 'rounded-lg border border-slate-200 bg-white p-4';
const cardTitle = 'mb-3 text-sm font-medium text-slate-600';
const clampScore = (v: number) => Math.max(0, Math.min(5, v));

/**
 * Read-only "drill-down" page for a single option: describes the product, the
 * literal facts behind it, and — crucially — shows the actual value that
 * motivates each requirement's score (so "Carrier weight: 5" reads as 6.2 lb).
 */
export default function OptionDetail({
  module,
  option,
  onBack,
}: {
  module: Module;
  option: Option;
  onBack: () => void;
}) {
  const setScore = useStore((s) => s.setScore);
  const max = maxScore(module.criteria);
  const total = weightedTotal(option, module.criteria);
  const isTop = topPick(module)?.id === option.id;
  const facts = optionFacts(option);
  const sources = option.priceSources ?? [];
  const best = bestSource(option);

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        ← Back to {module.label}
      </button>

      {/* Header */}
      <header className="flex flex-wrap items-start gap-5">
        <Thumb src={option.image} alt={option.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-800">
              {option.name || '(unnamed)'}
            </h2>
            {isTop && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Top pick
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{module.label}</p>

          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Best price</div>
              <div className="text-xl font-semibold tabular-nums text-slate-800">
                {formatMoney(bestPrice(option))}
              </div>
              {best && <div className="text-xs text-slate-400">at {best.retailer}</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Weighted score</div>
              <div className="text-xl font-semibold tabular-nums text-indigo-600">
                {total}
                <span className="text-sm font-normal text-slate-400"> / {max}</span>
              </div>
              <div className="text-xs text-slate-400">
                {formatPercent(percent(option, module.criteria))} of max
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Key facts — the literal values used for the evaluation */}
      <section className={card}>
        <h3 className={cardTitle}>Key facts — what we evaluated</h3>
        {facts.length === 0 ? (
          <p className="text-sm text-slate-400">No product facts recorded yet.</p>
        ) : (
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {facts.map((f) => (
              <div
                key={f.key}
                className="flex justify-between gap-4 border-b border-dashed border-slate-100 py-1"
              >
                <dt className="shrink-0 text-slate-500">{f.label}</dt>
                <dd className="text-right font-medium text-slate-800">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Scoring against requirements — score + the literal value that motivates it */}
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-600">Scoring against requirements</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Each requirement's 0–5 score (editable — edits save instantly) with the
            actual product value behind it.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Requirement</th>
              <th className="px-3 py-2 text-center font-medium">Weight</th>
              <th className="px-3 py-2 text-center font-medium">Score</th>
              <th className="px-3 py-2 text-right font-medium">Weighted</th>
              <th className="px-4 py-2 font-medium">Why this score</th>
            </tr>
          </thead>
          <tbody>
            {module.criteria.map((c) => {
              const score = option.scores[c.id] ?? 0;
              const evidence = criterionEvidence(c, option);
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="px-4 py-2 font-medium text-slate-700">{c.label}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-500">×{c.weight}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={score}
                      onChange={(e) =>
                        setScore(module.id, option.id, c.id, clampScore(Number(e.target.value) || 0))
                      }
                      aria-label={`Score for ${c.label}`}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center font-semibold tabular-nums text-slate-700"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-700">
                    {c.weight * score}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {evidence ?? <span className="text-slate-300">— see notes</span>}
                  </td>
                </tr>
              );
            })}
            {module.criteria.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-slate-400">
                  No requirements defined for this module yet.
                </td>
              </tr>
            )}
          </tbody>
          {module.criteria.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                <td className="px-4 py-2" colSpan={3}>
                  Weighted total
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {total} <span className="font-normal text-slate-400">/ {max}</span>
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {formatPercent(percent(option, module.criteria))} of max
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {/* Pricing & sources */}
      <section className={card}>
        <h3 className={cardTitle}>Pricing & sources</h3>
        {sources.length === 0 ? (
          <p className="text-sm text-slate-400">
            No sourced prices — showing reference price {formatMoney(option.price)}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Retailer</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-center font-medium">In stock</th>
                  <th className="px-3 py-2 font-medium">Checked</th>
                  <th className="px-3 py-2 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => {
                  const isBest = best != null && s === best;
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 ${isBest ? 'bg-emerald-50' : ''}`}
                    >
                      <td className="px-3 py-2 text-slate-700">
                        {s.retailer || '—'}
                        {isBest && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                            best
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {formatMoney(s.price)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.inStock !== false ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-300">out</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.checkedAt}</td>
                      <td className="px-3 py-2">
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            view ↗
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Notes */}
      {option.notes && (
        <section className={card}>
          <h3 className={cardTitle}>Notes</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {option.notes}
          </p>
        </section>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { Module, Option } from '../lib/types';
import { bestPrice, bestSource, formatMoney } from '../lib/scoring';
import { optionFacts } from '../lib/evidence';
import Thumb from './Thumb';
import Lightbox from './Lightbox';

/** Best link to where an option's image / data came from. */
const imageSource = (o: Option): string | undefined =>
  (o.attributes as Record<string, unknown>).sourceUrl as string | undefined ??
  bestSource(o)?.url ??
  o.priceSources?.[0]?.url;

const card = 'rounded-lg border border-slate-200 bg-white p-4';
const cardTitle = 'mb-3 text-sm font-medium text-slate-600';

/**
 * Read-only "drill-down" page for a single option: the product image, the
 * literal sourced facts, and the priced retailer sources behind the best price.
 * Purely informational — no scores or ranking.
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
  const [zoom, setZoom] = useState(false);
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
        {option.image ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="cursor-zoom-in rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Enlarge image"
            title="Click to enlarge"
          >
            <Thumb src={option.image} alt={option.name} size="lg" />
          </button>
        ) : (
          <Thumb src={option.image} alt={option.name} size="lg" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold text-slate-800">
            {option.name || '(unnamed)'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{module.label}</p>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Best price</div>
            <div className="text-xl font-semibold tabular-nums text-slate-800">
              {formatMoney(bestPrice(option))}
            </div>
            {best && <div className="text-xs text-slate-400">at {best.retailer}</div>}
          </div>
        </div>
      </header>

      {/* Key facts — the literal sourced values */}
      <section className={card}>
        <h3 className={cardTitle}>Key facts</h3>
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

      {zoom && (
        <Lightbox
          src={option.image}
          alt={option.name}
          sourceUrl={imageSource(option)}
          onClose={() => setZoom(false)}
        />
      )}
    </div>
  );
}

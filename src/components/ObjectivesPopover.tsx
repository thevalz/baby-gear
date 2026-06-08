import { useEffect, useState } from 'react';
import type { Module } from '../lib/types';
import { useStore } from '../lib/store';

const clampWeight = (v: number) => Math.max(1, Math.min(5, v));
const numInput =
  'w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums focus:border-indigo-400 focus:outline-none';

/** A 1–5 clickable importance meter — the criterion's weight, as values not a bare number. */
function WeightMeter({ weight, label, onChange }: { weight: number; label: string; onChange: (w: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Set ${label} importance to ${n} of 5`}
          title={`${n}/5`}
          className={`h-4 w-3.5 rounded-sm transition-colors hover:ring-1 hover:ring-indigo-300 ${
            n <= weight ? 'bg-indigo-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Popover for managing the trade study's *objectives* (how much each requirement
 * matters — the criterion weights) and *precise requirements* (the visitor's hard
 * limits: back-seat length and budgets the matrix flags fails against). Edits are
 * live: the comparison matrix re-ranks and re-flags as you type.
 */
export default function ObjectivesPopover({ modules }: { modules: Module[] }) {
  const [open, setOpen] = useState(false);
  const backSeatLengthIn = useStore((s) => s.preferences.backSeatLengthIn);
  const overallBudget = useStore((s) => s.config.overallBudget);
  const updatePreferences = useStore((s) => s.updatePreferences);
  const updateCriterion = useStore((s) => s.updateCriterion);
  const setModuleBudget = useStore((s) => s.setModuleBudget);
  const setOverallBudget = useStore((s) => s.setOverallBudget);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        🎯 Objectives &amp; requirements <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Objectives and requirements"
            className="absolute right-0 z-50 mt-1 max-h-[72vh] w-[26rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="sticky top-0 border-b border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Objectives &amp; requirements</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Tune what matters and your hard limits — the matrix re-ranks and flags fails live.
              </p>
            </div>

            {/* Precise requirements — the visitor's hard limits. */}
            <section className="border-b border-slate-100 px-4 py-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Your hard limits
              </h4>
              <label className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-slate-600">
                  Back-seat rear-facing length
                  <span className="block text-xs text-slate-400">flags car seats that won’t fit your car</span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={backSeatLengthIn ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      updatePreferences({
                        backSeatLengthIn: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                      })
                    }
                    className={numInput}
                  />
                  <span className="text-xs text-slate-400">in</span>
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-slate-600">Overall budget</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={overallBudget}
                    onChange={(e) => setOverallBudget(Number(e.target.value) || 0)}
                    className={numInput}
                  />
                </span>
              </label>
            </section>

            {/* Objectives — criterion weights + per-module budget, grouped by category. */}
            {modules.map((m) => (
              <section key={m.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m.label}</h4>
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    Budget <span className="text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={25}
                      value={m.budget}
                      onChange={(e) => setModuleBudget(m.id, Number(e.target.value) || 0)}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                </div>
                {m.criteria.length === 0 ? (
                  <p className="text-xs text-slate-400">No requirements defined for this category.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {m.criteria.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-600" title={c.label}>
                          {c.label}
                        </span>
                        <WeightMeter
                          weight={c.weight}
                          label={c.label}
                          onChange={(w) => updateCriterion(m.id, c.id, { weight: clampWeight(w) })}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

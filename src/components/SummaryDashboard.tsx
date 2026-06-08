import { useEffect, useState, type ReactNode } from 'react';
import type { AppState, InventoryStatus, Module } from '../lib/types';
import { useStore } from '../lib/store';
import {
  bestPrice,
  formatMoney,
  formatPercent,
  maxScore,
  percent,
  topPick,
  weightedTotal,
} from '../lib/scoring';
import { assetUrl } from '../lib/assets';
import { computeCompatibilityFlags, type FlagSeverity } from '../lib/compatibility';
import CreatorBanner from './CreatorBanner';
import RecommendationHero from './RecommendationHero';
import ComparisonMatrix from './ComparisonMatrix';
import ObjectivesPopover from './ObjectivesPopover';

/** Module that incurs the stroller adapter cost. */
const ADAPTER_MODULE_ID = 'car-seat';
const DEFAULT_ADAPTER_COST = 100;

const adapterCostFor = (module: Module, adapterCost: number): number =>
  module.id === ADAPTER_MODULE_ID ? adapterCost : 0;

const FLAG_STYLES: Record<FlagSeverity, { wrap: string; icon: string }> = {
  red: { wrap: 'bg-red-50 text-red-700 border-red-200', icon: '⛔' },
  yellow: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⚠️' },
  green: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✅' },
};

function Pill({ over }: { over: boolean }) {
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
        over ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      {over ? 'over' : 'under'}
    </span>
  );
}

/** The breakdown views that used to sit inline on the page; now opened from the menu. */
type PanelId = 'recommendation' | 'picks' | 'budget' | 'compat' | 'inventory';
const PANELS: { id: PanelId; label: string; icon: string }[] = [
  { id: 'recommendation', label: 'Recommendation', icon: '⭐' },
  { id: 'picks', label: 'Top pick per module', icon: '🏆' },
  { id: 'budget', label: 'Cost vs. budget', icon: '💰' },
  { id: 'compat', label: 'Compatibility flags', icon: '🔗' },
  { id: 'inventory', label: 'Keep / Return tracker', icon: '📦' },
];

/** Dropdown that surfaces the secondary breakdown views. */
function InsightsMenu({ onOpen }: { onOpen: (id: PanelId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Insights <span className="text-xs text-slate-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {PANELS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onOpen(p.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <span aria-hidden>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Centered overlay used to host a single breakdown view opened from the menu. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="my-4 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function SummaryDashboard({
  state,
  onOpenDetail,
}: {
  state: AppState;
  onOpenDetail: (moduleId: string, optionId: string) => void;
}) {
  const { modules, config, inventory } = state;
  const setAdapterCost = useStore((s) => s.setAdapterCost);
  const setInventoryStatus = useStore((s) => s.setInventoryStatus);
  const setInventoryRefund = useStore((s) => s.setInventoryRefund);
  const resetOnboarding = useStore((s) => s.resetOnboarding);

  const [panel, setPanel] = useState<PanelId | null>(null);
  // Lifted so the matrices' limit chips can open the Objectives popover too.
  const [objectivesOpen, setObjectivesOpen] = useState(false);

  const adapterCost = config.adapterCost ?? DEFAULT_ADAPTER_COST;
  const picks = modules.map((m) => ({ module: m, pick: topPick(m) }));

  // Cost vs budget (top-pick best price + adapter cost per module).
  const totalCost = picks.reduce(
    (sum, { module, pick }) => sum + (pick ? bestPrice(pick) : 0) + adapterCostFor(module, adapterCost),
    0,
  );
  const overOverall = config.overallBudget > 0 && totalCost > config.overallBudget;

  const compatFlags = computeCompatibilityFlags(state);

  // Net spend.
  const purchases = picks.reduce((sum, { pick }) => sum + (pick ? bestPrice(pick) : 0), 0);
  const refunds = inventory
    .filter((i) => i.status === 'return')
    .reduce((sum, i) => sum + (i.refund || 0), 0);
  const netSpend = purchases - refunds;

  const moduleLabel = (id: string) => modules.find((m) => m.id === id)?.label ?? '—';
  const totalOptions = modules.reduce((n, m) => n + m.options.length, 0);

  const panelTitle = PANELS.find((p) => p.id === panel)?.label ?? '';

  return (
    <div className="space-y-6">
      <CreatorBanner onRetake={resetOnboarding} />

      {/* Page header — the matrix is the primary artifact; everything else is in the menu. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Compare all options</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {totalOptions} option{totalOptions === 1 ? '' : 's'} across {modules.length} categor
            {modules.length === 1 ? 'y' : 'ies'} — click any row for the value breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ObjectivesPopover modules={modules} open={objectivesOpen} onOpenChange={setObjectivesOpen} />
          <InsightsMenu onOpen={setPanel} />
        </div>
      </div>

      {/* Primary: the comparison matrix, one per module */}
      {modules.map((m) => (
        <section key={m.id} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-slate-600">{m.label}</h3>
            <span className="text-xs text-slate-400">
              {m.options.length} option{m.options.length === 1 ? '' : 's'} · ranked best-first
            </span>
          </div>
          <ComparisonMatrix
            module={m}
            onOpenDetail={(optionId) => onOpenDetail(m.id, optionId)}
            onEditLimits={() => setObjectivesOpen(true)}
          />
        </section>
      ))}

      {/* Secondary views, opened from the Insights menu */}
      {panel && (
        <Modal title={panelTitle} onClose={() => setPanel(null)}>
          {panel === 'recommendation' && <RecommendationHero state={state} onOpenDetail={onOpenDetail} />}

          {panel === 'picks' && (
            <ul className="space-y-2">
              {modules.map((m) => {
                const t = topPick(m);
                const img = assetUrl(t?.image);
                const row = (
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {t &&
                        (img ? (
                          <img src={img} alt={t.name} className="h-12 w-12 shrink-0 rounded-md border border-slate-200 bg-white object-contain" loading="lazy" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-slate-300">🍼</div>
                        ))}
                      <div className="text-left">
                        <div className="text-xs uppercase tracking-wide text-slate-400">{m.label}</div>
                        <div className="font-medium text-slate-800">{t ? t.name : '—'}</div>
                      </div>
                    </div>
                    {t && (
                      <div className="text-right text-sm tabular-nums text-slate-500">
                        <div className="font-semibold text-indigo-600">{formatPercent(percent(t, m.criteria))}</div>
                        <div>
                          {weightedTotal(t, m.criteria)}/{maxScore(m.criteria)} · {formatMoney(bestPrice(t))}
                        </div>
                      </div>
                    )}
                  </div>
                );
                return (
                  <li key={m.id} className="border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    {t ? (
                      <button
                        onClick={() => {
                          setPanel(null);
                          onOpenDetail(m.id, t.id);
                        }}
                        title="View product details"
                        className="-mx-1 w-full rounded-md px-1 py-1 hover:bg-slate-50"
                      >
                        {row}
                      </button>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {panel === 'budget' && (
            <>
              <div className="mb-3 flex items-center justify-end">
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  Adapter $
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={adapterCost}
                    onChange={(e) => setAdapterCost(Number(e.target.value) || 0)}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums"
                  />
                </label>
              </div>
              <dl className="space-y-1 text-sm">
                {picks.map(({ module, pick }) => {
                  const adapter = adapterCostFor(module, adapterCost);
                  const effective = (pick ? bestPrice(pick) : 0) + adapter;
                  const over = module.budget > 0 && effective > module.budget;
                  return (
                    <div key={module.id} className="flex justify-between border-b border-dashed border-slate-100 py-1">
                      <dt className="text-slate-600">
                        {module.label}
                        {adapter > 0 && <span className="text-slate-400"> (+{formatMoney(adapter)} adapter)</span>}
                      </dt>
                      <dd className="tabular-nums text-slate-700">
                        {formatMoney(effective)} / {formatMoney(module.budget)}
                        <Pill over={over} />
                      </dd>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 font-semibold">
                  <dt>Total vs. overall budget</dt>
                  <dd className="tabular-nums">
                    {formatMoney(totalCost)} / {formatMoney(config.overallBudget)}
                    <Pill over={overOverall} />
                  </dd>
                </div>
              </dl>
            </>
          )}

          {panel === 'compat' && (
            compatFlags.length === 0 ? (
              <p className="text-sm text-slate-400">No compatibility relationships in play.</p>
            ) : (
              <ul className="space-y-2">
                {compatFlags.map((flag, i) => {
                  const style = FLAG_STYLES[flag.severity];
                  return (
                    <li
                      key={`${flag.relationId}-${i}`}
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${style.wrap}`}
                    >
                      <span aria-hidden>{style.icon}</span>
                      <span>{flag.message}</span>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {panel === 'inventory' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 pr-3 font-medium">Item</th>
                      <th className="py-2 pr-3 font-medium">Category</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 text-right font-medium">Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 text-slate-800">{item.name}</td>
                        <td className="py-2 pr-3 text-slate-500">{moduleLabel(item.moduleId)}</td>
                        <td className="py-2 pr-3">
                          <select
                            value={item.status}
                            onChange={(e) => setInventoryStatus(item.id, e.target.value as InventoryStatus)}
                            className="rounded-md border border-slate-300 px-2 py-1"
                          >
                            <option value="keep">keep</option>
                            <option value="return">return</option>
                            <option value="undecided">undecided</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <span className="text-slate-400">$</span>
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={item.refund}
                            onChange={(e) => setInventoryRefund(item.id, Number(e.target.value) || 0)}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums"
                          />
                        </td>
                      </tr>
                    ))}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-slate-400">
                          No inventory items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">New purchases (selected picks)</dt>
                  <dd className="tabular-nums">{formatMoney(purchases)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Refunds (returning items)</dt>
                  <dd className="tabular-nums">−{formatMoney(refunds)}</dd>
                </div>
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <dt>Net spend</dt>
                  <dd className="tabular-nums">{formatMoney(netSpend)}</dd>
                </div>
              </dl>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

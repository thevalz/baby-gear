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
import type { MetricContext } from '../lib/criterionMetric';
import { availableViews, filterByView, type ViewKey } from '../lib/savedViews';
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

export default function CompareView({
  state,
  activeModuleId,
  onSelectModule,
  onAddModule,
  onEditModule,
  onOpenDetail,
}: {
  state: AppState;
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onAddModule: () => void;
  onEditModule: (id: string) => void;
  onOpenDetail: (moduleId: string, optionId: string) => void;
}) {
  const { modules, config, inventory } = state;
  const setAdapterCost = useStore((s) => s.setAdapterCost);
  const setInventoryStatus = useStore((s) => s.setInventoryStatus);
  const setInventoryRefund = useStore((s) => s.setInventoryRefund);
  const resetOnboarding = useStore((s) => s.resetOnboarding);
  const backSeatLengthIn = useStore((s) => s.preferences.backSeatLengthIn);

  const [panel, setPanel] = useState<PanelId | null>(null);
  // Lifted so the grid's limit chips can open the Objectives popover too.
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  // C1 tier-2: the active saved-view filter for the shown module.
  const [view, setView] = useState<ViewKey>('all');

  // The module the tabs/drawer point at (guard against a stale id after delete).
  const activeModule = modules.find((m) => m.id === activeModuleId) ?? modules[0];
  const ctx: MetricContext = { backSeatLengthIn, budget: activeModule?.budget };
  const views = activeModule ? availableViews(activeModule, ctx) : [];
  // Fall back to "All" if the active view stops applying (e.g. budget cleared).
  const activeView: ViewKey = views.some((v) => v.key === view) ? view : 'all';
  // Pass the grid a module narrowed to the view's rows; it re-ranks the subset.
  const shownModule =
    activeModule ? { ...activeModule, options: filterByView(activeModule, activeView, ctx) } : undefined;

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

  const panelTitle = PANELS.find((p) => p.id === panel)?.label ?? '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CreatorBanner onRetake={resetOnboarding} />

      {/* Tier 1 — module tabs (switch product) + objectives / insights / edit. */}
      <div className="flex flex-none flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
          {modules.map((m) => {
            const on = m.id === activeModule?.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  on ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {m.label}
                <span className={`ml-1.5 text-xs ${on ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {m.options.length}
                </span>
              </button>
            );
          })}
          <button
            onClick={onAddModule}
            className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-slate-400 hover:text-slate-600"
          >
            + Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ObjectivesPopover modules={modules} open={objectivesOpen} onOpenChange={setObjectivesOpen} />
          <InsightsMenu onOpen={setPanel} />
          {activeModule && (
            <button
              onClick={() => onEditModule(activeModule.id)}
              title="Edit this module’s criteria & options"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ✎ Edit
            </button>
          )}
        </div>
      </div>

      {/* Tier 2 — saved views (filter this product). */}
      {activeModule && views.length > 1 && (
        <div className="flex flex-none items-center gap-1 overflow-x-auto border-y border-slate-100 bg-white px-3 py-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">View</span>
          {views.map((v) => {
            const on = v.key === activeView;
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  on
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-600'
                    : 'border border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {v.label}
                <span className={`ml-1.5 ${on ? 'text-indigo-400' : 'text-slate-400'}`}>{v.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary — the comparison grid is the page. */}
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {shownModule && activeModule ? (
          <ComparisonMatrix
            key={activeModule.id}
            module={shownModule}
            onOpenDetail={(optionId) => onOpenDetail(activeModule.id, optionId)}
            onEditLimits={() => setObjectivesOpen(true)}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-400">
            No modules yet — add one from the menu.
          </p>
        )}
      </div>

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

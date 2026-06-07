import type { AppState, InventoryStatus, Module } from '../lib/types';
import { useStore } from '../lib/store';
import { formatMoney, formatPercent, maxScore, percent, topPick, weightedTotal } from '../lib/scoring';
import { computeCompatibilityFlags, type FlagSeverity } from '../lib/compatibility';

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

const card = 'rounded-lg border border-slate-200 bg-white p-4';
const cardTitle = 'mb-3 text-sm font-medium text-slate-600';

export default function SummaryDashboard({ state }: { state: AppState }) {
  const { modules, config, inventory } = state;
  const setAdapterCost = useStore((s) => s.setAdapterCost);
  const setInventoryStatus = useStore((s) => s.setInventoryStatus);
  const setInventoryRefund = useStore((s) => s.setInventoryRefund);

  const adapterCost = config.adapterCost ?? DEFAULT_ADAPTER_COST;
  const picks = modules.map((m) => ({ module: m, pick: topPick(m) }));

  // Card 2: cost vs budget (top-pick price + adapter cost per module).
  const totalCost = picks.reduce(
    (sum, { module, pick }) => sum + (pick?.price ?? 0) + adapterCostFor(module, adapterCost),
    0,
  );
  const overOverall = config.overallBudget > 0 && totalCost > config.overallBudget;

  // Card 3: compatibility flags.
  const compatFlags = computeCompatibilityFlags(state);

  // Card 4: net spend.
  const purchases = picks.reduce((sum, { pick }) => sum + (pick?.price ?? 0), 0);
  const refunds = inventory
    .filter((i) => i.status === 'return')
    .reduce((sum, i) => sum + (i.refund || 0), 0);
  const netSpend = purchases - refunds;

  const moduleLabel = (id: string) => modules.find((m) => m.id === id)?.label ?? '—';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Summary</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 1 — Top pick per module */}
        <section className={card}>
          <h3 className={cardTitle}>Top pick per module</h3>
          <ul className="space-y-2">
            {modules.map((m) => {
              const t = topPick(m);
              return (
                <li key={m.id} className="flex items-baseline justify-between gap-2 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{m.label}</div>
                    <div className="font-medium text-slate-800">{t ? t.name : '—'}</div>
                  </div>
                  {t && (
                    <div className="text-right text-sm tabular-nums text-slate-500">
                      <div className="font-semibold text-indigo-600">{formatPercent(percent(t, m.criteria))}</div>
                      <div>
                        {weightedTotal(t, m.criteria)}/{maxScore(m.criteria)} · {formatMoney(t.price)}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Card 2 — Cost vs. budget */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600">Cost vs. budget</h3>
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
              const effective = (pick?.price ?? 0) + adapter;
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
        </section>

        {/* Card 3 — Compatibility flags */}
        <section className={card}>
          <h3 className={cardTitle}>Compatibility flags</h3>
          {compatFlags.length === 0 ? (
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
          )}
        </section>

        {/* Card 4 — Keep / Return tracker */}
        <section className={`${card} lg:col-span-2`}>
          <h3 className={cardTitle}>Keep / Return tracker</h3>
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
        </section>
      </div>
    </div>
  );
}

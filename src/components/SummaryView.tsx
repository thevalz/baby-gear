import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AppState } from '../lib/types';
import {
  formatMoney,
  formatPercent,
  percent,
  selectedOption,
  topPick,
  weightedTotal,
  maxScore,
} from '../lib/scoring';

export default function SummaryView({ state }: { state: AppState }) {
  const { modules, config, inventory } = state;

  const picks = modules.map((m) => ({ module: m, pick: selectedOption(m) }));
  const totalCost = picks.reduce((sum, p) => sum + (p.pick ? p.pick.price : 0), 0);
  const overBudget = config.overallBudget > 0 && totalCost > config.overallBudget;

  const refunds = inventory
    .filter((i) => i.status === 'return')
    .reduce((sum, i) => sum + (i.refund || 0), 0);
  const netSpend = totalCost - refunds;

  const chartData = modules.map((m) => {
    const t = topPick(m);
    return { name: m.label, percent: t ? Math.round(percent(t, m.criteria) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Summary</h2>

      {/* Top pick per category */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const t = topPick(m);
          return (
            <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{m.label}</div>
              {t ? (
                <>
                  <div className="mt-1 text-lg font-semibold text-slate-800">{t.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {weightedTotal(t, m.criteria)}/{maxScore(m.criteria)} · {formatPercent(percent(t, m.criteria))} ·{' '}
                    {formatMoney(t.price)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-slate-400">No options</div>
              )}
            </div>
          );
        })}
      </section>

      {/* Cost vs budget + net spend */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-600">Total cost vs. budget</h3>
          <dl className="space-y-1 text-sm">
            {picks.map(({ module, pick }) => (
              <div key={module.id} className="flex justify-between border-b border-dashed border-slate-100 py-1">
                <dt className="text-slate-600">
                  {module.label}: <span className="font-medium text-slate-800">{pick?.name ?? '—'}</span>
                </dt>
                <dd className="tabular-nums text-slate-700">{formatMoney(pick?.price ?? 0)}</dd>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-semibold">
              <dt>Total</dt>
              <dd className={`tabular-nums ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatMoney(totalCost)} / {formatMoney(config.overallBudget)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-600">Keep / return — net spend</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-dashed border-slate-100 py-1">
              <dt className="text-slate-600">New purchases (selected picks)</dt>
              <dd className="tabular-nums">{formatMoney(totalCost)}</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 py-1">
              <dt className="text-slate-600">Refunds (returning)</dt>
              <dd className="tabular-nums">−{formatMoney(refunds)}</dd>
            </div>
            <div className="flex justify-between pt-2 font-semibold">
              <dt>Net spend</dt>
              <dd className="tabular-nums">{formatMoney(netSpend)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Top pick % by category */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-600">Top pick score by category</h3>
        <ResponsiveContainer width="100%" height={Math.max(160, modules.length * 56)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="percent" fill="#4f46e5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

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
import type { Module } from '../lib/types';
import { useStore } from '../lib/store';
import {
  formatMoney,
  formatPercent,
  maxScore,
  percent,
  topPick,
  weightedTotal,
} from '../lib/scoring';

export default function ModuleView({ module }: { module: Module }) {
  const setModuleBudget = useStore((s) => s.setModuleBudget);
  const max = maxScore(module.criteria);
  const best = topPick(module);

  const chartData = module.options.map((o) => ({
    name: o.name,
    score: weightedTotal(o, module.criteria),
    isTop: best?.id === o.id,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-800">{module.label}</h2>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Budget
          <span className="text-slate-400">$</span>
          <input
            type="number"
            min={0}
            step={50}
            value={module.budget}
            onChange={(e) => setModuleBudget(module.id, Number(e.target.value) || 0)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums text-slate-700"
          />
          <span>· Max score {max}</span>
        </label>
      </header>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th className="px-3 py-2 text-left font-medium">Option</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              {module.criteria.map((c) => (
                <th key={c.id} className="px-3 py-2 text-center font-medium">
                  {c.label}
                  <span className="ml-1 text-xs font-semibold text-indigo-600">×{c.weight}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Weighted</th>
              <th className="px-3 py-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {module.options.map((o) => {
              const isTop = best?.id === o.id;
              return (
                <tr
                  key={o.id}
                  className={[
                    'border-b border-slate-100 last:border-0',
                    isTop ? 'bg-indigo-50' : '',
                  ].join(' ')}
                >
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {isTop && <span className="mr-1 text-indigo-600">★</span>}
                    {o.name}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(o.price)}</td>
                  {module.criteria.map((c) => (
                    <td key={c.id} className="px-3 py-2 text-center tabular-nums text-slate-600">
                      {o.scores[c.id] ?? '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {weightedTotal(o, module.criteria)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {formatPercent(percent(o, module.criteria))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-600">
          Weighted total by option (max {max})
        </h3>
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
    </div>
  );
}

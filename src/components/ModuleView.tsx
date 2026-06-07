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
import { formatPercent, maxScore, percent, topPick, weightedTotal } from '../lib/scoring';

const clampScore = (v: number) => Math.max(0, Math.min(5, v));
const clampWeight = (v: number) => Math.max(1, Math.min(5, v));

export default function ModuleView({
  module,
  onDeleted,
}: {
  module: Module;
  onDeleted: () => void;
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

  const max = maxScore(module.criteria);
  const best = topPick(module);

  const chartData = module.options.map((o) => ({
    name: o.name || '(unnamed)',
    score: weightedTotal(o, module.criteria),
    isTop: best?.id === o.id,
  }));

  const numInput =
    'rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums';
  const textInput = 'rounded-md border border-slate-300 px-2 py-1';

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

      {/* Options table (editable) */}
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
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {module.options.map((o) => {
              const isTop = best?.id === o.id;
              return (
                <tr key={o.id} className={`border-b border-slate-100 last:border-0 ${isTop ? 'bg-indigo-50' : ''}`}>
                  <td className="px-3 py-2">
                    {isTop && <span className="mr-1 text-indigo-600">★</span>}
                    <input
                      value={o.name}
                      onChange={(e) => updateOption(module.id, o.id, { name: e.target.value })}
                      className={`w-44 ${textInput} font-medium text-slate-800`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={o.price}
                      onChange={(e) => updateOption(module.id, o.id, { price: Number(e.target.value) || 0 })}
                      className={`w-24 ${numInput}`}
                    />
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
              );
            })}
            {module.options.length === 0 && (
              <tr>
                <td colSpan={module.criteria.length + 5} className="px-3 py-3 text-slate-400">
                  No options yet — add one below.
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

import type { AppState, Option } from '../lib/types';
import {
  cellFit,
  compatibilityMatrices,
  type CompatMatrix,
  type Fit,
  type MatrixColumn,
} from '../lib/compatibility';
import { overallRanks, rankLabel } from '../lib/ranking';
import { bestPrice, formatMoney } from '../lib/scoring';
import Thumb from './Thumb';

const card = 'rounded-lg border border-slate-200 bg-white';

/** A fit cell: green ✓ / red ✗ / grey – (unknown). */
function FitCell({ fit }: { fit: Fit }) {
  if (fit === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
        ✓
      </span>
    );
  }
  if (fit === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
        ✗
      </span>
    );
  }
  return (
    <span
      title="No fit data sourced yet"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-400"
    >
      –
    </span>
  );
}

function ColumnHeader({ col }: { col: MatrixColumn }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Thumb src={col.option.image} alt={col.option.name} />
      <div className="max-w-[6.5rem] text-center text-xs font-medium leading-tight text-slate-700">
        {col.option.name}
      </div>
      {col.owned ? (
        <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
          You own
        </span>
      ) : (
        <span className="text-[10px] uppercase tracking-wide text-slate-400">considering</span>
      )}
      {col.fitAttribute == null && (
        <span className="text-[10px] text-slate-300">no map</span>
      )}
    </div>
  );
}

function MatrixTable({
  matrix,
  onOpenDetail,
}: {
  matrix: CompatMatrix;
  onOpenDetail: (moduleId: string, optionId: string) => void;
}) {
  const { relation, sourceModule, columns } = matrix;
  const ranks = overallRanks(sourceModule);
  // Best-first so the most-relevant seats lead the grid.
  const rows = [...sourceModule.options].sort(
    (a, b) => (ranks[a.id]?.rank ?? Infinity) - (ranks[b.id]?.rank ?? Infinity),
  );
  const fitCount = (seat: Option) =>
    columns.reduce((n, c) => n + (cellFit(seat, c) === true ? 1 : 0), 0);
  const mappedCols = columns.filter((c) => c.fitAttribute != null).length;

  return (
    <section className={`${card} overflow-x-auto`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-600">{relation.label}</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          Every {relation.sourceNoun} (rows) against every {relation.targetNoun} (columns).
          ✓ fits · ✗ doesn't · – not sourced. Click a {relation.sourceNoun} to see details.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-medium text-slate-500">
              {sourceModule.label}
            </th>
            {columns.map((c) => (
              <th key={c.option.id} className="px-3 py-3">
                <button
                  onClick={() => onOpenDetail(matrix.targetModule.id, c.option.id)}
                  title={`View ${c.option.name}`}
                  className="rounded-md p-1 hover:bg-slate-100"
                >
                  <ColumnHeader col={c} />
                </button>
              </th>
            ))}
            <th className="px-3 py-3 text-center font-medium text-slate-500">Fits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((seat) => {
            const r = ranks[seat.id];
            const fits = fitCount(seat);
            return (
              <tr key={seat.id} className="border-b border-slate-100 last:border-0">
                <td className="sticky left-0 z-10 bg-white px-4 py-2">
                  <button
                    onClick={() => onOpenDetail(sourceModule.id, seat.id)}
                    title="View product details"
                    className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-slate-50"
                  >
                    <Thumb src={seat.image} alt={seat.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{seat.name}</span>
                      <span className="block text-xs tabular-nums text-slate-400">
                        {r ? `${rankLabel(r)} · ` : ''}
                        {formatMoney(bestPrice(seat))}
                      </span>
                    </span>
                  </button>
                </td>
                {columns.map((c) => (
                  <td
                    key={c.option.id}
                    className={`px-3 py-2 text-center ${c.owned ? 'bg-indigo-50/40' : ''}`}
                  >
                    <FitCell fit={cellFit(seat, c)} />
                  </td>
                ))}
                <td className="px-3 py-2 text-center tabular-nums text-slate-500">
                  {fits}/{mappedCols}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Browsable cross-product fit matrix — the "this car seat fits this stroller"
 * grid. Exposes the whole field so a shopper can see the tradeoffs *between*
 * products (not just whether their own pick fits their own gear).
 */
export default function CompatibilityView({
  state,
  onOpenDetail,
}: {
  state: AppState;
  onOpenDetail: (moduleId: string, optionId: string) => void;
}) {
  const matrices = compatibilityMatrices(state);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-800">Fit &amp; compatibility</h2>
        <p className="mt-1 text-sm text-slate-500">
          Which products work together. The grid covers the whole market, with the
          gear you already own highlighted.
        </p>
      </header>

      {matrices.length === 0 ? (
        <div className={`${card} p-6 text-sm text-slate-400`}>
          No cross-product relationships are configured yet. Add one to
          <code className="mx-1 rounded bg-slate-100 px-1">compatibilityMap</code>
          in <code className="rounded bg-slate-100 px-1">src/lib/compatibility.ts</code>.
        </div>
      ) : (
        matrices.map((m) => (
          <MatrixTable key={m.relation.id} matrix={m} onOpenDetail={onOpenDetail} />
        ))
      )}

      {matrices.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <FitCell fit={true} /> fits
          </span>
          <span className="flex items-center gap-1.5">
            <FitCell fit={false} /> doesn't fit
          </span>
          <span className="flex items-center gap-1.5">
            <FitCell fit={null} /> no fit data sourced yet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded bg-indigo-50 ring-1 ring-indigo-200" /> gear you own
          </span>
        </div>
      )}
    </div>
  );
}

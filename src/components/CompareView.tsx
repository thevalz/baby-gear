import { useEffect, useState, type ReactNode } from 'react';
import type { AppState, InventoryStatus } from '../lib/types';
import { useStore } from '../lib/store';
import { formatMoney } from '../lib/scoring';
import { computeCompatibilityFlags, type FlagSeverity } from '../lib/compatibility';
import CreatorBanner from './CreatorBanner';
import ComparisonMatrix from './ComparisonMatrix';

const FLAG_STYLES: Record<FlagSeverity, { wrap: string; icon: string }> = {
  red: { wrap: 'bg-red-50 text-red-700 border-red-200', icon: '⛔' },
  yellow: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⚠️' },
  green: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✅' },
};

/** Informational side panels, opened from the menu. */
type PanelId = 'compat' | 'inventory';
const PANELS: { id: PanelId; label: string; icon: string }[] = [
  { id: 'compat', label: 'Compatibility notes', icon: '🔗' },
  { id: 'inventory', label: 'Keep / Return tracker', icon: '📦' },
];

/** Dropdown that surfaces the informational side panels. */
function InsightsMenu({ onOpen }: { onOpen: (id: PanelId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        More <span className="text-xs text-slate-400">▾</span>
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

/** Centered overlay used to host a single side panel opened from the menu. */
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
  onOpenDetail,
}: {
  state: AppState;
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onOpenDetail: (moduleId: string, optionId: string) => void;
}) {
  const { modules, inventory } = state;
  const setInventoryStatus = useStore((s) => s.setInventoryStatus);
  const setInventoryRefund = useStore((s) => s.setInventoryRefund);
  const resetOnboarding = useStore((s) => s.resetOnboarding);

  const [panel, setPanel] = useState<PanelId | null>(null);

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? modules[0];
  const compatFlags = computeCompatibilityFlags(state);

  const refunds = inventory
    .filter((i) => i.status === 'return')
    .reduce((sum, i) => sum + (i.refund || 0), 0);

  const moduleLabel = (id: string) => modules.find((m) => m.id === id)?.label ?? '—';
  const panelTitle = PANELS.find((p) => p.id === panel)?.label ?? '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CreatorBanner onRetake={resetOnboarding} />

      {/* Module tabs (switch category). */}
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
        </div>
        <InsightsMenu onOpen={setPanel} />
      </div>

      {/* Primary — the information table is the page. */}
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {activeModule ? (
          <ComparisonMatrix
            key={activeModule.id}
            module={activeModule}
            onOpenDetail={(optionId) => onOpenDetail(activeModule.id, optionId)}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-400">
            No categories yet.
          </p>
        )}
      </div>

      {/* Informational side panels, opened from the menu */}
      {panel && (
        <Modal title={panelTitle} onClose={() => setPanel(null)}>
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
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total refunds (returning items)</dt>
                  <dd className="tabular-nums">{formatMoney(refunds)}</dd>
                </div>
              </dl>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

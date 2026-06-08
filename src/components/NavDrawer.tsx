import { useEffect } from 'react';
import type { Module } from '../lib/types';

/**
 * Off-canvas navigation drawer summoned by the header's hamburger. In the C1
 * layout the grid is the page on every screen size, so — unlike the old sticky
 * sidebar — this is always a drawer, never a permanent rail. It just switches
 * which module the compare grid shows (the module tabs do the same inline) and
 * adds new modules.
 */
export default function NavDrawer({
  modules,
  activeModuleId,
  open,
  onClose,
  onSelect,
  onAddModule,
}: {
  modules: Module[];
  activeModuleId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onAddModule: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} aria-hidden />}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 max-w-[82vw] transform border-r border-slate-200 bg-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h1 className="text-base font-semibold text-slate-800">👶 Baby-Gear</h1>
            <p className="text-xs text-slate-500">Trade Study</p>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <nav className="p-2">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Modules</p>
          {modules.map((m) => {
            const active = m.id === activeModuleId;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={[
                  'mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-slate-800 font-medium text-white' : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                <span className="truncate">{m.label}</span>
                <span className={`text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>{m.options.length}</span>
              </button>
            );
          })}

          <button
            onClick={onAddModule}
            className="mt-2 w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            + Add module
          </button>
        </nav>
      </aside>
    </>
  );
}

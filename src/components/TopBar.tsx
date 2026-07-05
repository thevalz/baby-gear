import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import type { AppState } from '../lib/types';

/**
 * The C1 shell's minimal header: a hamburger that summons the nav drawer, the
 * brand for context, and a single overflow menu for the global data tools that
 * used to crowd the old toolbar (refresh prices, export, import, reset).
 * Everything else — modules, views, objectives, insights — lives with the grid.
 */
export default function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const replaceState = useStore((s) => s.replaceState);
  const resetToSeed = useStore((s) => s.resetToSeed);
  const refreshPricingFromSeed = useStore((s) => s.refreshPricingFromSeed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleExport() {
    const data = useStore.getState().exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!parsed.config || !Array.isArray(parsed.modules) || !Array.isArray(parsed.inventory)) {
          throw new Error('File is missing config / modules / inventory.');
        }
        replaceState(parsed);
      } catch (err) {
        alert('Import failed: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const item = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50';

  return (
    <header className="flex h-12 flex-none items-center gap-2.5 border-b border-slate-200 bg-white px-3">
      <button
        onClick={onOpenDrawer}
        aria-label="Open menu"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
      >
        <span className="block h-0.5 w-[18px] bg-current" />
        <span className="mt-[3px] block h-0.5 w-[18px] bg-current" />
        <span className="mt-[3px] block h-0.5 w-[18px] bg-current" />
      </button>
      <span className="text-sm font-bold tracking-tight text-slate-800">
        👶 Baby-Gear
        <span className="ml-1.5 hidden text-[11px] font-medium text-slate-400 sm:inline">sourced facts</span>
      </span>

      <span className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setMenu((v) => !v)}
          aria-label="More"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          ⋯
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} aria-hidden />
            <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                className={item}
                onClick={() => {
                  refreshPricingFromSeed();
                  setMenu(false);
                }}
              >
                ↻ Refresh prices
              </button>
              <button
                className={item}
                onClick={() => {
                  handleExport();
                  setMenu(false);
                }}
              >
                ⭳ Export data
              </button>
              <button
                className={item}
                onClick={() => {
                  fileRef.current?.click();
                  setMenu(false);
                }}
              >
                ⭱ Import data
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenu(false);
                  if (confirm('Reset all data back to the seed? This discards your edits.')) resetToSeed();
                }}
              >
                ⟲ Reset to seed
              </button>
            </div>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
    </header>
  );
}

import { useRef } from 'react';
import { useStore } from '../lib/store';
import type { AppState } from '../lib/types';
import { formatMoney } from '../lib/scoring';

export default function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const overallBudget = useStore((s) => s.config.overallBudget);
  const setOverallBudget = useStore((s) => s.setOverallBudget);
  const replaceState = useStore((s) => s.replaceState);
  const resetToSeed = useStore((s) => s.resetToSeed);

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
    e.target.value = ''; // allow re-importing the same filename
  }

  const btn =
    'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100';

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        Overall budget
        <span className="text-slate-400">$</span>
        <input
          type="number"
          min={0}
          step={50}
          value={overallBudget}
          onChange={(e) => setOverallBudget(Number(e.target.value) || 0)}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums"
        />
        <span className="text-slate-400">({formatMoney(overallBudget)})</span>
      </label>

      <div className="flex items-center gap-2">
        <button className={btn} onClick={handleExport}>
          Export
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <button
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          onClick={() => {
            if (confirm('Reset all data back to the seed? This discards your edits.')) resetToSeed();
          }}
        >
          Reset
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </header>
  );
}

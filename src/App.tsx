import { useState } from 'react';
import Sidebar from './components/Sidebar';
import SummaryView from './components/SummaryView';
import ModuleView from './components/ModuleView';
import { usePersistentState } from './lib/storage';
import type { AppState, NavItem } from './lib/types';
import seed from './data/seed.json';

const SUMMARY_ID = 'summary';

export default function App() {
  const [state] = usePersistentState<AppState>('baby-gear-state', seed as unknown as AppState);
  const [activeId, setActiveId] = useState<string>(SUMMARY_ID);

  const navItems: NavItem[] = [
    { id: SUMMARY_ID, label: 'Summary' },
    ...state.modules.map((m) => ({ id: m.id, label: m.label })),
  ];

  const activeModule = state.modules.find((m) => m.id === activeId);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar items={navItems} activeId={activeId} onSelect={setActiveId} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">
          {activeId === SUMMARY_ID ? (
            <SummaryView state={state} />
          ) : activeModule ? (
            <ModuleView module={activeModule} />
          ) : (
            <p className="text-slate-500">Nothing selected.</p>
          )}
        </div>
      </main>
    </div>
  );
}

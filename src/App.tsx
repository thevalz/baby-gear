import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import SummaryDashboard from './components/SummaryDashboard';
import ModuleView from './components/ModuleView';
import { useStore } from './lib/store';
import type { AppState, NavItem } from './lib/types';

const SUMMARY_ID = 'summary';

export default function App() {
  const config = useStore((s) => s.config);
  const modules = useStore((s) => s.modules);
  const inventory = useStore((s) => s.inventory);
  const addModule = useStore((s) => s.addModule);
  const [activeId, setActiveId] = useState<string>(SUMMARY_ID);

  const navItems: NavItem[] = [
    { id: SUMMARY_ID, label: 'Summary' },
    ...modules.map((m) => ({ id: m.id, label: m.label })),
  ];

  const activeModule = modules.find((m) => m.id === activeId);
  const state: AppState = { config, modules, inventory };

  const handleAddModule = () => {
    const id = addModule();
    setActiveId(id); // jump straight into the new module to edit it
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar items={navItems} activeId={activeId} onSelect={setActiveId} onAddModule={handleAddModule} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Toolbar />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            {activeModule ? (
              <ModuleView module={activeModule} onDeleted={() => setActiveId(SUMMARY_ID)} />
            ) : (
              <SummaryDashboard state={state} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState } from 'react';
import TopBar from './components/TopBar';
import NavDrawer from './components/NavDrawer';
import CompareView from './components/CompareView';
import OptionDetail from './components/OptionDetail';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore } from './lib/store';
import type { AppState } from './lib/types';

/** Points at a single option's drill-down page, openable from any view. */
export interface DetailRef {
  moduleId: string;
  optionId: string;
}

export default function App() {
  const config = useStore((s) => s.config);
  const modules = useStore((s) => s.modules);
  const inventory = useStore((s) => s.inventory);
  const resetToSeed = useStore((s) => s.resetToSeed);

  // The category the compare grid points at. Defaults to the first module.
  const [activeId, setActiveId] = useState<string>(() => modules[0]?.id ?? '');
  const [detail, setDetail] = useState<DetailRef | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const state: AppState = { config, modules, inventory };
  // Guard against a stale active id.
  const activeModuleId = modules.some((m) => m.id === activeId) ? activeId : modules[0]?.id ?? '';
  const activeModule = modules.find((m) => m.id === activeModuleId);

  // Pick a category to view (from tabs or the drawer).
  const selectModule = (id: string) => {
    setActiveId(id);
    setDetail(null);
    setDrawerOpen(false);
  };

  // Open one option's drill-down page.
  const openDetail = (moduleId: string, optionId: string) => {
    setActiveId(moduleId);
    setDetail({ moduleId, optionId });
    setDrawerOpen(false);
  };

  const detailModule = detail ? modules.find((m) => m.id === detail.moduleId) : undefined;
  const detailOption = detailModule?.options.find((o) => o.id === detail?.optionId);

  let content: React.ReactNode;
  let boundaryKey: string;
  let boundaryLabel: string;
  if (detailModule && detailOption) {
    boundaryKey = `detail:${detail!.moduleId}:${detail!.optionId}`;
    boundaryLabel = detailOption.name;
    content = (
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <OptionDetail module={detailModule} option={detailOption} onBack={() => setDetail(null)} />
        </div>
      </div>
    );
  } else {
    boundaryKey = `compare:${activeModuleId}`;
    boundaryLabel = activeModule ? activeModule.label : 'Compare';
    content = (
      <CompareView
        state={state}
        activeModuleId={activeModuleId}
        onSelectModule={selectModule}
        onOpenDetail={openDetail}
      />
    );
  }

  return (
    <>
      <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />
        <NavDrawer
          modules={modules}
          activeModuleId={activeModuleId}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelect={selectModule}
        />
        <main className="flex min-h-0 flex-1 flex-col">
          {/* Keyed by the active view so switching spins up a fresh boundary —
              a crash in one view never strands the rest. */}
          <ErrorBoundary key={boundaryKey} label={boundaryLabel} onReset={resetToSeed}>
            {content}
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

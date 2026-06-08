import { useState } from 'react';
import TopBar from './components/TopBar';
import NavDrawer from './components/NavDrawer';
import CompareView from './components/CompareView';
import ModuleView from './components/ModuleView';
import OptionDetail from './components/OptionDetail';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './components/Onboarding';
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
  const addModule = useStore((s) => s.addModule);
  const resetToSeed = useStore((s) => s.resetToSeed);
  const onboardingDone = useStore((s) => s.preferences.completed);

  // The module the compare grid / editor points at. Defaults to the first module.
  const [activeId, setActiveId] = useState<string>(() => modules[0]?.id ?? '');
  // Whether we're editing the active module (ModuleView) vs. comparing (CompareView).
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<DetailRef | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const state: AppState = { config, modules, inventory };
  // Guard against a stale active id (e.g. after a module delete).
  const activeModuleId = modules.some((m) => m.id === activeId) ? activeId : modules[0]?.id ?? '';
  const activeModule = modules.find((m) => m.id === activeModuleId);

  // Pick a module to compare (from tabs or the drawer).
  const selectModule = (id: string) => {
    setActiveId(id);
    setEditing(false);
    setDetail(null);
    setDrawerOpen(false);
  };

  // Open one option's drill-down page (from a row's "full detail" link).
  const openDetail = (moduleId: string, optionId: string) => {
    setActiveId(moduleId);
    setEditing(false);
    setDetail({ moduleId, optionId });
    setDrawerOpen(false);
  };

  const editModule = (id: string) => {
    setActiveId(id);
    setEditing(true);
    setDetail(null);
  };

  const handleAddModule = () => {
    const id = addModule();
    setActiveId(id);
    setEditing(true); // jump straight into the empty module to set it up
    setDetail(null);
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
  } else if (editing && activeModule) {
    boundaryKey = `edit:${activeModule.id}`;
    boundaryLabel = activeModule.label;
    content = (
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <ModuleView
            module={activeModule}
            onOpenDetail={(optionId) => openDetail(activeModule.id, optionId)}
            onDeleted={() => selectModule(modules.find((m) => m.id !== activeModule.id)?.id ?? '')}
          />
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
        onAddModule={handleAddModule}
        onEditModule={editModule}
        onOpenDetail={openDetail}
      />
    );
  }

  return (
    <>
      {!onboardingDone && (
        <Onboarding
          onClose={() => {
            setEditing(false);
            setDetail(null);
          }}
        />
      )}
      <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />
        <NavDrawer
          modules={modules}
          activeModuleId={activeModuleId}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelect={selectModule}
          onAddModule={handleAddModule}
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

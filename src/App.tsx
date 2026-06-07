import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import SummaryDashboard from './components/SummaryDashboard';
import ModuleView from './components/ModuleView';
import OptionDetail from './components/OptionDetail';
import CompatibilityView from './components/CompatibilityView';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './components/Onboarding';
import { useStore } from './lib/store';
import type { AppState, NavItem } from './lib/types';

const SUMMARY_ID = 'summary';
const COMPAT_ID = 'compatibility';

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
  const [activeId, setActiveId] = useState<string>(SUMMARY_ID);
  const [detail, setDetail] = useState<DetailRef | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: SUMMARY_ID, label: 'Summary' },
    { id: COMPAT_ID, label: 'Fit & compatibility' },
    ...modules.map((m) => ({ id: m.id, label: m.label })),
  ];

  const activeModule = modules.find((m) => m.id === activeId);
  const state: AppState = { config, modules, inventory };

  // Detail navigation, lifted to the app so the Summary and module views can
  // both open an option's drill-down page (and the sidebar highlights its
  // module). A stale ref (deleted option) simply falls back to the module view.
  const openDetail = (moduleId: string, optionId: string) => {
    setActiveId(moduleId);
    setDetail({ moduleId, optionId });
    setSidebarOpen(false); // close the mobile drawer after navigating
  };
  const selectNav = (id: string) => {
    setActiveId(id);
    setDetail(null);
    setSidebarOpen(false); // close the mobile drawer after navigating
  };
  const detailModule = detail ? modules.find((m) => m.id === detail.moduleId) : undefined;
  const detailOption = detailModule?.options.find((o) => o.id === detail?.optionId);

  const handleAddModule = () => {
    const id = addModule();
    selectNav(id); // jump straight into the new module to edit it
  };

  const content =
    detailModule && detailOption ? (
      <OptionDetail module={detailModule} option={detailOption} onBack={() => setDetail(null)} />
    ) : activeModule ? (
      <ModuleView
        module={activeModule}
        onOpenDetail={(optionId) => openDetail(activeModule.id, optionId)}
        onDeleted={() => selectNav(SUMMARY_ID)}
      />
    ) : activeId === COMPAT_ID ? (
      <CompatibilityView state={state} onOpenDetail={openDetail} />
    ) : (
      <SummaryDashboard state={state} onOpenDetail={openDetail} />
    );

  return (
    <>
      {!onboardingDone && <Onboarding onClose={() => selectNav(SUMMARY_ID)} />}
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar
          items={navItems}
          activeId={activeId}
          onSelect={selectNav}
          onAddModule={handleAddModule}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile top bar with the menu toggle (hidden on lg+, where the sidebar is static). */}
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>
            <span className="text-sm font-semibold text-slate-800">👶 Baby-Gear</span>
          </div>
          <Toolbar />
          <div className="flex-1 overflow-auto">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
              {/* Keyed by the active view (incl. which option's detail) so switching
                  spins up a fresh boundary — a crash in one view never strands the rest. */}
              <ErrorBoundary
                key={detailOption ? `detail:${detail!.moduleId}:${detail!.optionId}` : activeId}
                label={
                  detailOption
                    ? detailOption.name
                    : activeModule
                      ? activeModule.label
                      : activeId === COMPAT_ID
                        ? 'Fit & compatibility'
                        : 'Summary'
                }
                onReset={resetToSeed}
              >
                {content}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

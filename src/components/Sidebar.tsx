import type { NavItem } from '../lib/types';

interface SidebarProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAddModule: () => void;
  /** Drawer open state (mobile only; the sidebar is always shown on lg+). */
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ items, activeId, onSelect, onAddModule, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop — only on mobile when the drawer is open. */}
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        className={[
          // Off-canvas drawer on mobile…
          'fixed inset-y-0 left-0 z-40 w-60 shrink-0 transform border-r border-slate-200 bg-white transition-transform duration-200',
          // …static, always-visible column on lg+.
          'lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h1 className="text-base font-semibold text-slate-800">👶 Baby-Gear</h1>
            <p className="text-xs text-slate-500">Trade Study</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="p-2">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={[
                  'w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors',
                  active
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                {item.label}
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

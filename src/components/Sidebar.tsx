import type { NavItem } from '../lib/types';

interface SidebarProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAddModule: () => void;
}

export default function Sidebar({ items, activeId, onSelect, onAddModule }: SidebarProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-5 py-4 border-b border-slate-200">
        <h1 className="text-base font-semibold text-slate-800">👶 Baby-Gear</h1>
        <p className="text-xs text-slate-500">Trade Study</p>
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
  );
}

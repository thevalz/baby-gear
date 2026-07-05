/**
 * Minimal header: a hamburger that summons the nav drawer and the site name.
 * This is a read-only product catalog, so there are no data tools here.
 */
export default function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
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
    </header>
  );
}

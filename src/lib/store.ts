import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import seed from '../data/seed.json';
import type { AppState } from './types';

const seedState = seed as unknown as AppState;

/** Deep clone so the imported seed is never mutated in place. */
const cloneSeed = (): AppState => JSON.parse(JSON.stringify(seedState));

interface StoreActions {
  /** Replace the entire data state (used by Import). */
  replaceState: (next: AppState) => void;
  /** Restore the original seed data. */
  resetToSeed: () => void;
  /** Snapshot of just the persisted data (used by Export). */
  exportState: () => AppState;
  setOverallBudget: (value: number) => void;
  setModuleBudget: (moduleId: string, value: number) => void;
}

export type Store = AppState & StoreActions;

const STORAGE_KEY = 'baby-gear-state';

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // --- initial data: loaded from seed.json on first run ---
      ...cloneSeed(),

      // --- actions ---
      replaceState: (next) =>
        set({ config: next.config, modules: next.modules, inventory: next.inventory }),

      resetToSeed: () => set(cloneSeed()),

      exportState: () => {
        const { config, modules, inventory } = get();
        return { config, modules, inventory };
      },

      setOverallBudget: (value) =>
        set((s) => ({ config: { ...s.config, overallBudget: value } })),

      setModuleBudget: (moduleId, value) =>
        set((s) => ({
          modules: s.modules.map((m) => (m.id === moduleId ? { ...m, budget: value } : m)),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only the data, not the action functions.
      partialize: (s) => ({ config: s.config, modules: s.modules, inventory: s.inventory }),
    },
  ),
);

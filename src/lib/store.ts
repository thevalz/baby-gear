import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import seed from '../data/seed.json';
import type { AppState, Criterion, InventoryStatus, Module, Option } from './types';

const seedState = seed as unknown as AppState;

/** Deep clone so the imported seed is never mutated in place. */
const cloneSeed = (): AppState => JSON.parse(JSON.stringify(seedState));

let uidCounter = 0;
const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;

/** Immutably replace one module within the modules array. */
const updateModuleIn = (modules: Module[], moduleId: string, fn: (m: Module) => Module): Module[] =>
  modules.map((m) => (m.id === moduleId ? fn(m) : m));

const DEFAULT_SCORE = 3; // neutral placeholder for new scores

interface StoreActions {
  /** Replace the entire data state (used by Import). */
  replaceState: (next: AppState) => void;
  /** Restore the original seed data. */
  resetToSeed: () => void;
  /** Snapshot of just the persisted data (used by Export). */
  exportState: () => AppState;
  setOverallBudget: (value: number) => void;
  setModuleBudget: (moduleId: string, value: number) => void;
  setAdapterCost: (value: number) => void;
  setInventoryStatus: (id: string, status: InventoryStatus) => void;
  setInventoryRefund: (id: string, refund: number) => void;

  // --- runtime module / criteria / option editing ---
  addModule: () => string; // returns the new module id
  deleteModule: (moduleId: string) => void;
  setModuleLabel: (moduleId: string, label: string) => void;
  addCriterion: (moduleId: string) => void;
  updateCriterion: (moduleId: string, criterionId: string, patch: Partial<Criterion>) => void;
  deleteCriterion: (moduleId: string, criterionId: string) => void;
  addOption: (moduleId: string) => void;
  updateOption: (moduleId: string, optionId: string, patch: Partial<Pick<Option, 'name' | 'price'>>) => void;
  deleteOption: (moduleId: string, optionId: string) => void;
  setScore: (moduleId: string, optionId: string, criterionId: string, value: number) => void;
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

      setAdapterCost: (value) => set((s) => ({ config: { ...s.config, adapterCost: value } })),

      setInventoryStatus: (id, status) =>
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === id ? { ...i, status } : i)),
        })),

      setInventoryRefund: (id, refund) =>
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === id ? { ...i, refund } : i)),
        })),

      // --- runtime module / criteria / option editing ---
      addModule: () => {
        const id = uid('mod');
        set((s) => ({
          modules: [
            ...s.modules,
            { id, label: 'New Category', budget: 0, selectedOptionId: null, criteria: [], options: [] },
          ],
        }));
        return id;
      },

      deleteModule: (moduleId) =>
        set((s) => ({ modules: s.modules.filter((m) => m.id !== moduleId) })),

      setModuleLabel: (moduleId, label) =>
        set((s) => ({ modules: updateModuleIn(s.modules, moduleId, (m) => ({ ...m, label })) })),

      addCriterion: (moduleId) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => {
            const c: Criterion = { id: uid('crit'), label: 'New criterion', weight: 3 };
            return {
              ...m,
              criteria: [...m.criteria, c],
              options: m.options.map((o) => ({ ...o, scores: { ...o.scores, [c.id]: DEFAULT_SCORE } })),
            };
          }),
        })),

      updateCriterion: (moduleId, criterionId, patch) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => ({
            ...m,
            criteria: m.criteria.map((c) => (c.id === criterionId ? { ...c, ...patch } : c)),
          })),
        })),

      deleteCriterion: (moduleId, criterionId) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => ({
            ...m,
            criteria: m.criteria.filter((c) => c.id !== criterionId),
            options: m.options.map((o) => {
              const scores = { ...o.scores };
              delete scores[criterionId];
              return { ...o, scores };
            }),
          })),
        })),

      addOption: (moduleId) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => {
            const scores: Record<string, number> = {};
            m.criteria.forEach((c) => {
              scores[c.id] = DEFAULT_SCORE;
            });
            const o: Option = {
              id: uid('opt'),
              moduleId,
              name: 'New option',
              price: 0,
              attributes: {},
              scores,
              notes: '',
            };
            return { ...m, options: [...m.options, o] };
          }),
        })),

      updateOption: (moduleId, optionId, patch) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => ({
            ...m,
            options: m.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
          })),
        })),

      deleteOption: (moduleId, optionId) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => ({
            ...m,
            options: m.options.filter((o) => o.id !== optionId),
            selectedOptionId: m.selectedOptionId === optionId ? null : m.selectedOptionId,
          })),
        })),

      setScore: (moduleId, optionId, criterionId, value) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) => ({
            ...m,
            options: m.options.map((o) =>
              o.id === optionId ? { ...o, scores: { ...o.scores, [criterionId]: value } } : o,
            ),
          })),
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

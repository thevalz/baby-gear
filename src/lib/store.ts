import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import seed from '../data/seed.json';
import type {
  AppState,
  Criterion,
  InventoryStatus,
  Module,
  Option,
  Preferences,
  PriceSource,
} from './types';
import { mergePricingFromSeed } from './sync';
import {
  applyOwnedStrollerToState,
  applyPreferences,
  applyVehicleFit,
  emptyPreferences,
} from './preferences';

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
  /** A visitor's onboarding answers (per-visitor; gates the first-run quiz). */
  preferences: Preferences;
  /** Apply the onboarding answers to the trade study and mark it completed. */
  completeOnboarding: (prefs: Preferences) => void;
  /** Clear answers so the first-run quiz shows again (keeps current data). */
  resetOnboarding: () => void;
  /** Merge a patch into the visitor's preferences (precise requirements live here). */
  updatePreferences: (patch: Partial<Preferences>) => void;
  /**
   * Set the vehicle and apply only its derived effect — relabel the fit
   * criterion ("<vehicle> rear-facing fit") — leaving hand-tuned weights alone.
   */
  setVehicle: (vehicle: string) => void;
  /**
   * Set the owned stroller and apply only its derived effect — record it as kept
   * inventory so the compatibility engine flags non-fitting seats — leaving
   * hand-tuned weights alone.
   */
  setOwnedStroller: (stroller: string) => void;

  /** Replace the entire data state (used by Import). */
  replaceState: (next: AppState) => void;
  /** Restore the original seed data. */
  resetToSeed: () => void;
  /** Fold the repo's latest prices/images into the working copy (keeps scores). */
  refreshPricingFromSeed: () => void;
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
  updateOption: (moduleId: string, optionId: string, patch: Partial<Pick<Option, 'name' | 'price' | 'image'>>) => void;
  deleteOption: (moduleId: string, optionId: string) => void;
  setScore: (moduleId: string, optionId: string, criterionId: string, value: number) => void;

  // --- price sources (the "pricing engine" data) ---
  addPriceSource: (moduleId: string, optionId: string) => void;
  updatePriceSource: (
    moduleId: string,
    optionId: string,
    index: number,
    patch: Partial<PriceSource>,
  ) => void;
  deletePriceSource: (moduleId: string, optionId: string, index: number) => void;
}

/** Immutably replace one option within a module. */
const updateOptionIn = (m: Module, optionId: string, fn: (o: Option) => Option): Module => ({
  ...m,
  options: m.options.map((o) => (o.id === optionId ? fn(o) : o)),
});

export type Store = AppState & StoreActions;

const STORAGE_KEY = 'baby-gear-state';

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // --- initial data: loaded from seed.json on first run ---
      ...cloneSeed(),
      preferences: emptyPreferences(),

      // --- onboarding ---
      completeOnboarding: (prefs) =>
        set((s) => {
          const applied = applyPreferences(
            { dataVersion: s.dataVersion, config: s.config, modules: s.modules, inventory: s.inventory },
            prefs,
          );
          return {
            config: applied.config,
            modules: applied.modules,
            inventory: applied.inventory,
            preferences: { ...prefs, completed: true },
          };
        }),

      resetOnboarding: () => set({ preferences: emptyPreferences() }),

      updatePreferences: (patch) =>
        set((s) => ({ preferences: { ...s.preferences, ...patch } })),

      setVehicle: (vehicle) =>
        set((s) => {
          const applied = applyVehicleFit(
            { dataVersion: s.dataVersion, config: s.config, modules: s.modules, inventory: s.inventory },
            vehicle,
          );
          return { modules: applied.modules, preferences: { ...s.preferences, vehicle } };
        }),

      setOwnedStroller: (stroller) =>
        set((s) => {
          const applied = applyOwnedStrollerToState(
            { dataVersion: s.dataVersion, config: s.config, modules: s.modules, inventory: s.inventory },
            stroller,
          );
          return { inventory: applied.inventory, preferences: { ...s.preferences, ownedStroller: stroller } };
        }),

      // --- actions ---
      replaceState: (next) =>
        set({
          dataVersion: next.dataVersion,
          config: next.config,
          modules: next.modules,
          inventory: next.inventory,
        }),

      resetToSeed: () => set({ ...cloneSeed(), preferences: emptyPreferences() }),

      refreshPricingFromSeed: () =>
        set((s) => {
          const merged = mergePricingFromSeed(
            { dataVersion: s.dataVersion, config: s.config, modules: s.modules, inventory: s.inventory },
            seedState,
            true, // force: manual button refreshes regardless of version
          );
          return { dataVersion: merged.dataVersion, modules: merged.modules };
        }),

      exportState: () => {
        const { dataVersion, config, modules, inventory } = get();
        return { dataVersion, config, modules, inventory };
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

      // --- price sources ---
      addPriceSource: (moduleId, optionId) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) =>
            updateOptionIn(m, optionId, (o) => {
              const src: PriceSource = {
                retailer: '',
                price: 0,
                url: '',
                inStock: true,
                checkedAt: new Date().toISOString().slice(0, 10),
              };
              return { ...o, priceSources: [...(o.priceSources ?? []), src] };
            }),
          ),
        })),

      updatePriceSource: (moduleId, optionId, index, patch) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) =>
            updateOptionIn(m, optionId, (o) => ({
              ...o,
              priceSources: (o.priceSources ?? []).map((src, i) =>
                i === index ? { ...src, ...patch } : src,
              ),
            })),
          ),
        })),

      deletePriceSource: (moduleId, optionId, index) =>
        set((s) => ({
          modules: updateModuleIn(s.modules, moduleId, (m) =>
            updateOptionIn(m, optionId, (o) => ({
              ...o,
              priceSources: (o.priceSources ?? []).filter((_, i) => i !== index),
            })),
          ),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only the data, not the action functions.
      partialize: (s) => ({
        dataVersion: s.dataVersion,
        config: s.config,
        modules: s.modules,
        inventory: s.inventory,
        preferences: s.preferences,
      }),
      // Repo is the source of truth: when the committed seed carries a newer
      // dataVersion than the persisted copy, fold its prices/images in while
      // keeping the user's scores/weights/budgets (see lib/sync.ts).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState> & { preferences?: Preferences };
        const data = mergePricingFromSeed(
          {
            dataVersion: p.dataVersion,
            config: p.config ?? current.config,
            modules: p.modules ?? current.modules,
            inventory: p.inventory ?? current.inventory,
          },
          seedState,
        );
        // Keep the returning visitor's onboarding answers (per-visitor, not seeded).
        return { ...current, ...data, preferences: p.preferences ?? current.preferences };
      },
    },
  ),
);

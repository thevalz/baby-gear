// Turns a new parent's onboarding answers into a personalized trade study.
//
// The scoring engine never changes — we only *derive the weights* (and a couple
// of labels) from plain-language answers, so the wall of sliders becomes a short
// conversation. Everything here is pure and unit-tested; the store calls
// `applyPreferences(state, prefs)` to fold answers into the working copy.

import type { AppState, Criterion, InventoryItem, Module, Preferences } from './types';

/**
 * The priorities offered in the quiz. Each maps to the criteria it should boost
 * via keyword match against the criterion's id + label — the same keyword
 * approach `evidence.ts` uses, so it keeps working as criteria are renamed or
 * added (including in new, user-created modules).
 */
export interface PriorityDef {
  key: string;
  label: string;
  /** Emoji shown on the quiz chip. */
  icon: string;
  /** Lower-cased keywords matched against `${criterion.id} ${criterion.label}`. */
  keywords: string[];
}

export const PRIORITIES: PriorityDef[] = [
  { key: 'price', label: 'Price & value', icon: '💰', keywords: ['price', 'cost', 'value'] },
  { key: 'safety', label: 'Safety', icon: '🛡️', keywords: ['safety'] },
  {
    key: 'lightweight',
    label: 'Lightweight & compact',
    icon: '🪶',
    keywords: ['weight', 'mass', 'carrier', 'fold', 'size'],
  },
  {
    key: 'longevity',
    label: 'Grows with baby',
    icon: '🌱',
    keywords: ['growth', 'height', 'headroom', 'outgrow', 'capacity', 'toddler', 'longevity', 'grows', 'age'],
  },
  {
    key: 'fit',
    label: 'Fits my car',
    icon: '🚗',
    keywords: ['fit', 'footprint', 'rear-facing', 'rearfacing', 'length', 'tacoma'],
  },
  {
    key: 'compat',
    label: 'Works with my stroller',
    icon: '🍼',
    keywords: ['compat', 'stroller', 'bob', 'adapter', 'ease'],
  },
  {
    key: 'ride',
    label: 'Smooth ride',
    icon: '🛞',
    keywords: ['ride', 'terrain', 'suspension'],
  },
];

const PRIORITY_BY_KEY = new Map(PRIORITIES.map((p) => [p.key, p]));

/** Default weight for a criterion no chosen priority touches. */
const BASE_WEIGHT = 2;
/** Weight for a criterion matched by the visitor's #1 priority. */
const TOP_WEIGHT = 5;
/** Weight for a criterion matched by any other chosen priority. */
const CHOSEN_WEIGHT = 4;

const haystack = (c: Pick<Criterion, 'id' | 'label'>): string => `${c.id} ${c.label}`.toLowerCase();

/** Does a criterion fall under a given priority key? */
export function criterionMatchesPriority(c: Pick<Criterion, 'id' | 'label'>, priorityKey: string): boolean {
  const def = PRIORITY_BY_KEY.get(priorityKey);
  if (!def) return false;
  const hay = haystack(c);
  return def.keywords.some((k) => hay.includes(k));
}

/**
 * Weight (1–5) for one criterion given the ordered priority list: the top
 * priority's criteria get 5, any other chosen priority's get 4, the rest get a
 * neutral 2. First match wins by priority order.
 */
export function weightForCriterion(c: Pick<Criterion, 'id' | 'label'>, priorities: string[]): number {
  for (let i = 0; i < priorities.length; i++) {
    if (criterionMatchesPriority(c, priorities[i])) {
      return i === 0 ? TOP_WEIGHT : CHOSEN_WEIGHT;
    }
  }
  return BASE_WEIGHT;
}

/** Re-weight every criterion in a module from the chosen priorities. */
function reweightModule(m: Module, priorities: string[]): Module {
  if (priorities.length === 0) return m;
  return {
    ...m,
    criteria: m.criteria.map((c) => ({ ...c, weight: weightForCriterion(c, priorities) })),
  };
}

/** Personalize the vehicle-fit criterion label, e.g. "Toyota Tacoma rear-facing fit". */
function personalizeVehicle(m: Module, vehicle: string): Module {
  return {
    ...m,
    criteria: m.criteria.map((c) =>
      criterionMatchesPriority(c, 'fit') ? { ...c, label: `${vehicle} rear-facing fit` } : c,
    ),
  };
}

/** Is this the stroller module the owned stroller belongs to? (id or label match). */
export const isStrollerModule = (m: Pick<Module, 'id' | 'label'>): boolean =>
  /stroller/i.test(m.id) || /stroller/i.test(m.label);

/**
 * Relabel the vehicle-fit criterion across all modules from a vehicle name, e.g.
 * "Toyota Tacoma rear-facing fit". This is the *only* derived effect of the
 * vehicle answer — weights and everything else are left untouched — so it can be
 * applied live from the Objectives popover without re-running the priority
 * re-weighting. A no-op for a blank name. Pure: returns a new state.
 */
export function applyVehicleFit(state: AppState, vehicle: string): AppState {
  const name = vehicle.trim();
  if (!name) return state;
  return { ...state, modules: state.modules.map((m) => personalizeVehicle(m, name)) };
}

/**
 * Record the owned stroller as kept inventory (so the compatibility engine flags
 * non-fitting seats) — the only derived effect of the owned-stroller answer, with
 * weights left untouched so it too can be applied live from the popover. A no-op
 * for a blank name. Pure: returns a new state.
 */
export function applyOwnedStrollerToState(state: AppState, stroller: string): AppState {
  const name = stroller.trim();
  if (!name) return state;
  return { ...state, inventory: applyOwnedStroller(state.inventory, state.modules, name) };
}

/**
 * Record the owned stroller as a kept inventory item so the compatibility engine
 * flags seats that don't fit it in red ("doesn't fit your <stroller>"). Other
 * stroller inventory drops to "undecided" — we only assume what the parent told
 * us. A no-op when the same stroller is already kept.
 */
function applyOwnedStroller(inventory: InventoryItem[], modules: Module[], stroller: string): InventoryItem[] {
  const strollerModule = modules.find(isStrollerModule);
  const moduleId = strollerModule?.id ?? 'stroller';
  const name = stroller.trim();

  const demoted = inventory.map((i) =>
    i.moduleId === moduleId && i.status === 'keep' && i.name.toLowerCase() !== name.toLowerCase()
      ? { ...i, status: 'undecided' as const }
      : i,
  );

  const existing = demoted.find((i) => i.moduleId === moduleId && i.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return demoted.map((i) => (i === existing ? { ...i, status: 'keep' as const } : i));
  }
  return [
    ...demoted,
    { id: `owned-${Date.now().toString(36)}`, name, moduleId, status: 'keep', refund: 0 },
  ];
}

/**
 * Fold a visitor's onboarding answers into the trade study: re-weight criteria
 * from their priorities, personalize the vehicle-fit label, set their budget,
 * and record their owned stroller for compatibility. Pure — returns a new state.
 */
export function applyPreferences(state: AppState, prefs: Preferences): AppState {
  // Re-weight from priorities first, then layer on the same targeted derived
  // effects the Objectives popover applies live (vehicle relabel, owned-stroller
  // inventory). Keeping these as shared helpers means the two entry points can't
  // drift apart.
  let next: AppState = {
    ...state,
    modules: state.modules.map((m) => reweightModule(m, prefs.priorities)),
  };

  if (prefs.vehicle?.trim()) next = applyVehicleFit(next, prefs.vehicle);
  if (prefs.ownedStroller?.trim()) next = applyOwnedStrollerToState(next, prefs.ownedStroller);

  if (prefs.budget && prefs.budget > 0) {
    next = { ...next, config: { ...next.config, overallBudget: prefs.budget } };
  }

  return next;
}

export const emptyPreferences = (): Preferences => ({ completed: false, priorities: [] });

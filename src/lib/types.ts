// Core data model. These interfaces match src/data/seed.json exactly.

export interface Config {
  overallBudget: number;
  adapterCost?: number;
}

export interface Criterion {
  id: string;
  label: string;
  weight: number; // 1–5
}

/** Free-form per-option attributes; every key seen in seed.json is listed. */
export interface OptionAttributes {
  // car-seat attributes
  carrierLb?: number;
  carrierLbVerify?: boolean;
  fitsWayfinder?: boolean;
  fitsAlterrain?: boolean;
  safety?: string;
  // stroller attributes
  brand?: string;
  type?: string;
  owned?: boolean;
}

export interface Option {
  id: string;
  moduleId: string;
  name: string;
  price: number;
  attributes: OptionAttributes;
  scores: Record<string, number>; // criterionId -> 1–5
  notes?: string;
}

export interface Module {
  id: string;
  label: string;
  budget: number;
  selectedOptionId: string | null;
  criteria: Criterion[];
  options: Option[];
}

export type InventoryStatus = 'keep' | 'return' | 'undecided';

export interface InventoryItem {
  id: string;
  name: string;
  moduleId: string;
  status: InventoryStatus;
  refund: number;
  notes?: string;
}

export interface AppState {
  config: Config;
  modules: Module[];
  inventory: InventoryItem[];
}

export type NavItem = { id: string; label: string };

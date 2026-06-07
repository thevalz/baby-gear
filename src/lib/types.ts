// Core data model for the trade study. See src/data/seed.json for an instance.

export interface Criterion {
  id: string;
  label: string;
  weight: number; // 1–5
}

export interface Option {
  id: string;
  moduleId: string;
  name: string;
  price: number;
  attributes: Record<string, unknown>;
  scores: Record<string, number>; // criterionId -> 1–5
  notes?: string;
}

export interface Module {
  id: string;
  label: string;
  budget: number;
  selectedOptionId?: string | null;
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

export interface Config {
  overallBudget: number;
  adapterCost?: number;
}

export interface AppState {
  config: Config;
  modules: Module[];
  inventory: InventoryItem[];
}

export type NavItem = { id: string; label: string };

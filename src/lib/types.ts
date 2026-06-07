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

/**
 * A single retailer price for an option, sourced by a Claude research session.
 * `priceSources` is the data the "pricing engine" produces; the app derives the
 * best (lowest in-stock) price from it via `bestPrice()` in scoring.ts.
 */
export interface PriceSource {
  retailer: string; // e.g. "Amazon", "Target", "buybuy Baby"
  price: number;
  url: string;
  inStock?: boolean; // default true when omitted
  checkedAt: string; // ISO date the price was sourced, e.g. "2026-06-07"
}

export interface Option {
  id: string;
  moduleId: string;
  name: string;
  /**
   * Reference/MSRP price. Retained for backward compatibility and as a fallback
   * when no `priceSources` exist; `bestPrice()` prefers the cheapest in-stock
   * entry in `priceSources` when present.
   */
  price: number;
  /** Repo-relative image path under public/, e.g. "images/nuna-pipa-aire-rx.jpg". */
  image?: string;
  /** Retailer prices sourced by a research session; drives best-price + sources UI. */
  priceSources?: PriceSource[];
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
  /**
   * Monotonic version of the repo's committed data. A pricing/sourcing session
   * bumps this after updating prices or images so the deployed app folds the
   * fresh data into returning visitors' localStorage (see lib/sync.ts).
   */
  dataVersion?: number;
  config: Config;
  modules: Module[];
  inventory: InventoryItem[];
}

export type NavItem = { id: string; label: string };

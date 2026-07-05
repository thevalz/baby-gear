// Core data model. These interfaces match src/data/seed.json exactly.

export interface Config {
  overallBudget: number;
  adapterCost?: number;
}

/**
 * A new parent's onboarding answers. Persisted per-visitor (NOT seeded), used to
 * personalize criterion weights, the vehicle-fit label, owned-stroller
 * compatibility, and the overall budget. `completed` gates the first-run quiz.
 */
export interface Preferences {
  completed: boolean;
  /** Priority keys the visitor chose, most-important first (see preferences.ts). */
  priorities: string[];
  /** Vehicle name, personalizes the rear-facing-fit criterion, e.g. "Toyota Tacoma". */
  vehicle?: string;
  /** Stroller they already own, drives red/yellow compatibility flags. */
  ownedStroller?: string;
  /** Their budget, copied into config.overallBudget. */
  budget?: number;
  /**
   * Usable rear-facing length of their back seat, in inches (front of the back
   * cushion to the back of a reclined front seat). Compared to each seat's
   * `rearFacingLengthIn` footprint to flag clearance problems before purchase.
   */
  backSeatLengthIn?: number;
}

/**
 * One critic/creator's take on an option — the unit this app aggregates
 * Rotten-Tomatoes style. Many endorsements across creators roll up into a
 * "critic score" (% recommended) shown alongside the spec-driven match score.
 */
export interface Endorsement {
  /** Creator / critic name, e.g. "The Baby Gear Lab". */
  critic: string;
  /** The fresh/rotten verdict. */
  verdict: 'recommended' | 'not-recommended';
  /** Optional 0–100 rating that critic gave it. */
  score?: number;
  /** Short pull-quote shown with the endorsement. */
  quote?: string;
  /** Link to the critic's review / video (or a timestamp in it). */
  url?: string;
  /** ISO date of the review. */
  date?: string;
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
  /** Rear-facing installed/shell length (front-to-back footprint), inches. */
  rearFacingLengthIn?: number;
  /** Max child HEIGHT/length limit (rear-facing), inches — drives outgrow-by-height. */
  maxHeightIn?: number;
  /** Max child WEIGHT limit, lb — drives the weight-capacity longevity score. */
  maxWeightLb?: number;
  /** True when the seat extends into toddlerhood (rear-faces to ~2 yr) vs a pure infant bucket. */
  convertsToToddler?: boolean;
  /** Manufacturer-published max age in months, when stated (omitted when not on the spec page). */
  maxAgeMonths?: number;
  fitsWayfinder?: boolean;
  fitsAlterrain?: boolean;
  safety?: string;
  // stroller attributes
  brand?: string;
  type?: string;
  owned?: boolean;
  /** Stroller weight (lb) — drives the weight & fold-size score. */
  weightLb?: number;
  /** Folded footprint as a human string, e.g. "16.5 × 22 × 32.5 in". */
  foldedDimsIn?: string;
  /** Wheel/tire setup, e.g. "12″ front / 16″ rear air-filled". */
  tires?: string;
  /** Suspension system, e.g. "Independent dual" or "SmoothShox". */
  suspension?: string;
  /** Max child weight capacity (lb). */
  maxChildLb?: number;
  /** Car-seat adapter approach — drives the adapter-ease score. */
  adapterSystem?: string;
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
  /** Optional deep link to the creator's review (or a timestamp in it) for this pick. */
  reviewUrl?: string;
  /** Critic/creator endorsements, aggregated into a Rotten-Tomatoes-style score. */
  endorsements?: Endorsement[];
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

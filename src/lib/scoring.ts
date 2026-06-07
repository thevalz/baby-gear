import type { Criterion, Module, Option } from './types';

/** Σ over criteria of (weight × score). */
export function weightedTotal(option: Option, criteria: Criterion[]): number {
  return criteria.reduce(
    (sum, c) => sum + (c.weight || 0) * (option.scores[c.id] || 0),
    0,
  );
}

/** 5 × Σ(weights) — the maximum achievable weighted total. */
export function maxScore(criteria: Criterion[]): number {
  return 5 * criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
}

/** weightedTotal / maxScore, in [0, 1]. */
export function percent(option: Option, criteria: Criterion[]): number {
  const max = maxScore(criteria);
  return max ? weightedTotal(option, criteria) / max : 0;
}

/** Options sorted by weighted total, highest first. */
export function rankedOptions(module: Module): Option[] {
  return [...module.options].sort(
    (a, b) => weightedTotal(b, module.criteria) - weightedTotal(a, module.criteria),
  );
}

/** Option with the highest weighted total (the "top pick"), or null if none. */
export function topPick(module: Module): Option | null {
  return rankedOptions(module)[0] ?? null;
}

/** The user-selected pick, defaulting to the top pick when none is chosen. */
export function selectedOption(module: Module): Option | null {
  if (module.selectedOptionId) {
    const found = module.options.find((o) => o.id === module.selectedOptionId);
    if (found) return found;
  }
  return topPick(module);
}

/**
 * The lowest in-stock price across an option's sourced retailers, falling back
 * to the option's reference `price` when no usable sources exist. This is what
 * the rest of the app should treat as "the price".
 */
export function bestPrice(option: Option): number {
  const usable = (option.priceSources ?? []).filter(
    (s) => s.inStock !== false && s.price > 0,
  );
  if (usable.length === 0) return option.price;
  return Math.min(...usable.map((s) => s.price));
}

/** The source object backing `bestPrice`, or null when falling back to `price`. */
export function bestSource(option: Option) {
  const usable = (option.priceSources ?? []).filter(
    (s) => s.inStock !== false && s.price > 0,
  );
  if (usable.length === 0) return null;
  return usable.reduce((lo, s) => (s.price < lo.price ? s : lo));
}

export const formatMoney = (n: number): string =>
  '$' + (Math.round((n || 0) * 100) / 100).toLocaleString();

export const formatPercent = (p: number): string => `${Math.round(p * 100)}%`;

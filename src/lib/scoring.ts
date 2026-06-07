import type { Module, Option } from './types';

/** Σ over criteria of (weight × score). */
export function weightedTotal(module: Module, option: Option): number {
  return module.criteria.reduce(
    (sum, c) => sum + (c.weight || 0) * (option.scores[c.id] || 0),
    0,
  );
}

/** 5 × Σ(weights) — the maximum achievable weighted total. */
export function maxScore(module: Module): number {
  return 5 * module.criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
}

/** weightedTotal / maxScore, in [0, 1]. */
export function percent(module: Module, option: Option): number {
  const max = maxScore(module);
  return max ? weightedTotal(module, option) / max : 0;
}

/** Option with the highest weighted total (the "top pick"), or null if none. */
export function topPick(module: Module): Option | null {
  return module.options.reduce<Option | null>(
    (best, o) => (best === null || weightedTotal(module, o) > weightedTotal(module, best) ? o : best),
    null,
  );
}

/** The user-selected pick, defaulting to the top pick when none is chosen. */
export function selectedOption(module: Module): Option | null {
  if (module.selectedOptionId) {
    const found = module.options.find((o) => o.id === module.selectedOptionId);
    if (found) return found;
  }
  return topPick(module);
}

export const formatMoney = (n: number): string =>
  '$' + (Math.round((n || 0) * 100) / 100).toLocaleString();

export const formatPercent = (p: number): string => `${Math.round(p * 100)}%`;

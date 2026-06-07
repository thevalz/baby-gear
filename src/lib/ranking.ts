// Rank-order / percentile scoring across the whole field of options.
//
// The weighted total in scoring.ts answers "how well does this option satisfy my
// weighted requirements" — but a bare number like 106/120 is opaque: it doesn't
// tell you whether that's the best on the market or middle of the pack. This
// module reframes every score as a *position in the field*: "#2 of 15" and an
// 88th-percentile standing, both overall and on each individual criterion.
//
// That makes the database navigable the way a shopper actually thinks ("which
// seats are top-tier on safety?") and surfaces the tradeoffs between products
// instead of hiding them behind an invented index. Pure + unit-tested.

import type { Module, Option } from './types';
import { percent, weightedTotal } from './scoring';

/** One option's standing within the field on some metric (higher value = better). */
export interface Rank {
  /** 1-based competition rank (ties share a rank; e.g. 1, 2, 2, 4). */
  rank: number;
  /** Size of the field being ranked. */
  of: number;
  /**
   * Position in the field, 0–100, where the best (or tied-best) is 100 and the
   * worst is 0. This is the "percentile across all available options" the
   * comparison view leads with instead of the raw index.
   */
  percentile: number;
}

/**
 * Rank a list of items by a value extractor (higher is better), keyed by a
 * stable id. Competition ranking: equal values share the lower rank.
 */
function rankBy<T>(
  items: T[],
  id: (t: T) => string,
  value: (t: T) => number,
): Record<string, Rank> {
  const n = items.length;
  const out: Record<string, Rank> = {};
  const values = items.map(value);
  items.forEach((item, i) => {
    const v = values[i];
    const strictlyBetter = values.reduce((acc, x) => acc + (x > v ? 1 : 0), 0);
    const rank = strictlyBetter + 1;
    const percentile = n <= 1 ? 100 : Math.round(((n - rank) / (n - 1)) * 100);
    out[id(item)] = { rank, of: n, percentile };
  });
  return out;
}

/** Overall standing of every option in a module, by weighted total. */
export function overallRanks(module: Module): Record<string, Rank> {
  return rankBy(
    module.options,
    (o) => o.id,
    (o) => weightedTotal(o, module.criteria),
  );
}

/** Standing of every option on a single criterion, by its 0–5 score. */
export function criterionRanks(module: Module, criterionId: string): Record<string, Rank> {
  return rankBy(
    module.options,
    (o) => o.id,
    (o) => o.scores[criterionId] ?? 0,
  );
}

/** Per-criterion ranks for the whole module: criterionId → (optionId → Rank). */
export function allCriterionRanks(module: Module): Record<string, Record<string, Rank>> {
  const out: Record<string, Record<string, Rank>> = {};
  for (const c of module.criteria) out[c.id] = criterionRanks(module, c.id);
  return out;
}

/** Convenience: one option's overall standing (recomputed against the field). */
export function rankOf(module: Module, option: Option): Rank {
  return overallRanks(module)[option.id] ?? { rank: 1, of: module.options.length || 1, percentile: 100 };
}

/** "#2 of 15" — the headline rank label. */
export const rankLabel = (r: Rank): string => `#${r.rank} of ${r.of}`;

/** Ordinal percentile label, e.g. "88th". */
export function percentileLabel(p: number): string {
  const mod100 = p % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : p % 10 === 1
        ? 'st'
        : p % 10 === 2
          ? 'nd'
          : p % 10 === 3
            ? 'rd'
            : 'th';
  return `${p}${suffix}`;
}

/**
 * A coarse tier for colour-coding a standing without leaning on the raw number.
 * top = top quartile of the field, weak = bottom quartile, mid = the middle.
 */
export type RankTier = 'top' | 'mid' | 'weak';
export function rankTier(r: Rank): RankTier {
  if (r.percentile >= 75) return 'top';
  if (r.percentile <= 25) return 'weak';
  return 'mid';
}

// Re-export so callers can pull the field metric from one place.
export { percent };

// Rotten-Tomatoes-style aggregation of creator/critic endorsements.
//
// The weighted "match" score answers *does this fit my needs on the specs*.
// The critic score answers *do the people I trust actually recommend it* — the
// aggregate of however many creators have weighed in. Surfacing both, side by
// side, is the influencer-facing hook: their verdict (and eventually their
// peers') becomes a first-class signal next to the data.

import type { Endorsement, Option } from './types';

export interface CriticAggregate {
  /** How many critics weighed in. */
  count: number;
  /** Share who recommended it, 0–1 (the "tomatometer"). */
  recommendedPct: number;
  /** Average of any numeric scores given, or null when none were. */
  avgScore: number | null;
  /** Convenience: count of recommend / not-recommend verdicts. */
  recommended: number;
  notRecommended: number;
}

export function aggregateEndorsements(endorsements?: Endorsement[]): CriticAggregate | null {
  if (!endorsements || endorsements.length === 0) return null;
  const recommended = endorsements.filter((e) => e.verdict === 'recommended').length;
  const notRecommended = endorsements.length - recommended;
  const scores = endorsements.map((e) => e.score).filter((s): s is number => typeof s === 'number');
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  return {
    count: endorsements.length,
    recommendedPct: recommended / endorsements.length,
    avgScore,
    recommended,
    notRecommended,
  };
}

/** Convenience pass-through from an option. */
export const criticScore = (option: Option): CriticAggregate | null =>
  aggregateEndorsements(option.endorsements);

/** "Fresh" once a majority of critics recommend it (matches the RT 60% line). */
export const isFresh = (agg: CriticAggregate): boolean => agg.recommendedPct >= 0.6;

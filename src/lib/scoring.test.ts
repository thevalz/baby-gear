import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState } from './types';
import { maxScore, rankedOptions, topPick, weightedTotal } from './scoring';

const state = seed as unknown as AppState;
const carSeat = state.modules.find((m) => m.id === 'car-seat')!;

// Re-scored consistently across all 15 seats using verified carrier weights,
// BOB Wayfinder/Alterrain compat flags, sourced best prices, and the growth
// criteria (outgrow-by-height, weight capacity, infant→toddler longevity)
// sourced in docs/research/car-seats/GROWTH_LIMITS.md. These are the five
// highest-scoring seats under the full criteria set.
const expectedTotals: Record<string, number> = {
  'Cybex Aton G Swivel': 106,
  'Graco SnugRide 35 Lite LX': 98,
  'Chicco KeyFit 35': 96,
  'Maxi-Cosi Mico Luxe': 92,
  'Clek Liing': 87,
};

describe('car-seat scoring', () => {
  it('maxScore = 5 × Σweight = 120', () => {
    expect(maxScore(carSeat.criteria)).toBe(120);
  });

  it('weighted totals match the expected values for the scored seats', () => {
    for (const [name, total] of Object.entries(expectedTotals)) {
      const option = carSeat.options.find((o) => o.name === name)!;
      expect(weightedTotal(option, carSeat.criteria)).toBe(total);
    }
  });

  it('ranks the scored seats descending by weighted total', () => {
    const scored = new Set(Object.keys(expectedTotals));
    const ranked = rankedOptions(carSeat)
      .map((o) => o.name)
      .filter((name) => scored.has(name));
    expect(ranked).toEqual([
      'Cybex Aton G Swivel',
      'Graco SnugRide 35 Lite LX',
      'Chicco KeyFit 35',
      'Maxi-Cosi Mico Luxe',
      'Clek Liing',
    ]);
  });

  it('topPick is the Cybex Aton G Swivel', () => {
    expect(topPick(carSeat)?.name).toBe('Cybex Aton G Swivel');
  });
});

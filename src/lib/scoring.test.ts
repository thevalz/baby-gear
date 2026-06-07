import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState } from './types';
import { maxScore, rankedOptions, topPick, weightedTotal } from './scoring';

const state = seed as unknown as AppState;
const carSeat = state.modules.find((m) => m.id === 'car-seat')!;

const expectedTotals: Record<string, number> = {
  'Nuna Pipa Aire RX': 67,
  'Cybex Aton G Swivel': 61,
  'Graco SnugRide 35 Lite LX': 60,
  'Chicco KeyFit 35': 52,
  'Britax B-Safe Gen2': 50,
};

describe('car-seat scoring', () => {
  it('maxScore = 5 × Σweight = 75', () => {
    expect(maxScore(carSeat.criteria)).toBe(75);
  });

  it('weighted totals match the expected values for the scored seats', () => {
    // The roster also holds un-scored research stubs (placeholder scores);
    // assert the hand-scored originals, which carry the real judgments.
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
      'Nuna Pipa Aire RX',
      'Cybex Aton G Swivel',
      'Graco SnugRide 35 Lite LX',
      'Chicco KeyFit 35',
      'Britax B-Safe Gen2',
    ]);
  });

  it('topPick is the Nuna Pipa Aire RX', () => {
    expect(topPick(carSeat)?.name).toBe('Nuna Pipa Aire RX');
  });
});

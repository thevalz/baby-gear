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

  it('weighted totals match the expected values', () => {
    for (const option of carSeat.options) {
      expect(weightedTotal(option, carSeat.criteria)).toBe(expectedTotals[option.name]);
    }
  });

  it('ranks options descending by weighted total', () => {
    const ranked = rankedOptions(carSeat).map((o) => o.name);
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

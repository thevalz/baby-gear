import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState, Module, Option } from './types';
import {
  allCriterionRanks,
  criterionRanks,
  overallRanks,
  percentileLabel,
  rankLabel,
  rankOf,
  rankTier,
} from './ranking';

const state = seed as unknown as AppState;
const carSeat = state.modules.find((m) => m.id === 'car-seat')!;
const byName = (m: Module, name: string): Option => m.options.find((o) => o.name === name)!;

/** A tiny synthetic module so the rank math is checkable by hand. */
function makeModule(scores: number[]): Module {
  return {
    id: 'm',
    label: 'M',
    budget: 0,
    selectedOptionId: null,
    criteria: [{ id: 'c', label: 'C', weight: 1 }],
    options: scores.map((s, i) => ({
      id: `o${i}`,
      moduleId: 'm',
      name: `o${i}`,
      price: 0,
      attributes: {},
      scores: { c: s },
    })),
  };
}

describe('overallRanks', () => {
  it('ranks by weighted total, best first, sized to the field', () => {
    const ranks = overallRanks(carSeat);
    const top = byName(carSeat, 'Cybex Aton G Swivel'); // highest total (106)
    expect(ranks[top.id].rank).toBe(1);
    expect(ranks[top.id].of).toBe(carSeat.options.length);
    expect(ranks[top.id].percentile).toBe(100);
  });

  it('the runner-up is rank 2', () => {
    const ranks = overallRanks(carSeat);
    const second = byName(carSeat, 'Graco SnugRide 35 Lite LX'); // total 98
    expect(ranks[second.id].rank).toBe(2);
  });
});

describe('competition ranking with ties', () => {
  const m = makeModule([5, 5, 3, 1]); // two tied at the top
  const ranks = criterionRanks(m, 'c');

  it('tied values share the lower rank', () => {
    expect(ranks['o0'].rank).toBe(1);
    expect(ranks['o1'].rank).toBe(1);
    expect(ranks['o2'].rank).toBe(3); // rank 2 is skipped after the tie
    expect(ranks['o3'].rank).toBe(4);
  });

  it('percentile runs 100 (best) to 0 (worst) across the field', () => {
    expect(ranks['o0'].percentile).toBe(100);
    expect(ranks['o3'].percentile).toBe(0);
    expect(ranks['o2'].percentile).toBe(Math.round(((4 - 3) / 3) * 100)); // 33
  });
});

describe('single-option field', () => {
  it('is trivially 100th-percentile rank 1', () => {
    const m = makeModule([3]);
    const r = rankOf(m, m.options[0]);
    expect(r).toEqual({ rank: 1, of: 1, percentile: 100 });
  });
});

describe('allCriterionRanks', () => {
  it('covers every criterion in the module', () => {
    const all = allCriterionRanks(carSeat);
    expect(Object.keys(all).sort()).toEqual(carSeat.criteria.map((c) => c.id).sort());
  });
});

describe('labels & tiers', () => {
  it('formats rank and percentile labels', () => {
    expect(rankLabel({ rank: 2, of: 15, percentile: 90 })).toBe('#2 of 15');
    expect(percentileLabel(1)).toBe('1st');
    expect(percentileLabel(2)).toBe('2nd');
    expect(percentileLabel(3)).toBe('3rd');
    expect(percentileLabel(11)).toBe('11th');
    expect(percentileLabel(88)).toBe('88th');
    expect(percentileLabel(100)).toBe('100th');
  });

  it('buckets standings into tiers by percentile', () => {
    expect(rankTier({ rank: 1, of: 10, percentile: 100 })).toBe('top');
    expect(rankTier({ rank: 5, of: 10, percentile: 50 })).toBe('mid');
    expect(rankTier({ rank: 10, of: 10, percentile: 0 })).toBe('weak');
  });
});

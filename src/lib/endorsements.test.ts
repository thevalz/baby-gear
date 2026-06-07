import { describe, expect, it } from 'vitest';
import type { Endorsement } from './types';
import { aggregateEndorsements, isFresh } from './endorsements';

const e = (verdict: Endorsement['verdict'], score?: number): Endorsement => ({
  critic: 'Critic',
  verdict,
  score,
});

describe('aggregateEndorsements', () => {
  it('returns null with no endorsements', () => {
    expect(aggregateEndorsements()).toBeNull();
    expect(aggregateEndorsements([])).toBeNull();
  });

  it('computes the recommended percentage and counts', () => {
    const agg = aggregateEndorsements([e('recommended'), e('recommended'), e('not-recommended')])!;
    expect(agg.count).toBe(3);
    expect(agg.recommended).toBe(2);
    expect(agg.notRecommended).toBe(1);
    expect(agg.recommendedPct).toBeCloseTo(2 / 3);
  });

  it('averages numeric scores and ignores missing ones', () => {
    const agg = aggregateEndorsements([e('recommended', 90), e('recommended', 80), e('not-recommended')])!;
    expect(agg.avgScore).toBe(85);
  });

  it('reports null avgScore when no critic gave a number', () => {
    expect(aggregateEndorsements([e('recommended')])!.avgScore).toBeNull();
  });
});

describe('isFresh', () => {
  it('is fresh at or above 60% recommended', () => {
    // 2 of 3 = 67% → fresh; 1 of 2 = 50% → not.
    expect(isFresh(aggregateEndorsements([e('recommended'), e('recommended'), e('not-recommended')])!)).toBe(true);
    expect(isFresh(aggregateEndorsements([e('recommended'), e('not-recommended')])!)).toBe(false);
  });
});

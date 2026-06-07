import { describe, expect, it } from 'vitest';
import { mergePricingFromSeed } from './sync';
import type { AppState, Option } from './types';

const opt = (id: string, over: Partial<Option> = {}): Option => ({
  id,
  moduleId: 'm',
  name: id,
  price: 100,
  attributes: {},
  scores: { a: 3 },
  ...over,
});

const state = (over: Partial<AppState>): AppState => ({
  dataVersion: 1,
  config: { overallBudget: 1000 },
  modules: [{ id: 'm', label: 'M', budget: 0, selectedOptionId: null, criteria: [], options: [opt('x')] }],
  inventory: [],
  ...over,
});

describe('mergePricingFromSeed', () => {
  it('leaves persisted state untouched when the seed is not newer', () => {
    const persisted = state({ dataVersion: 2 });
    const seed = state({ dataVersion: 2, modules: [{ ...state({}).modules[0], options: [opt('x', { price: 50 })] }] });
    expect(mergePricingFromSeed(persisted, seed)).toBe(persisted);
  });

  it('folds in newer seed prices/images but keeps user scores', () => {
    const persisted = state({
      dataVersion: 1,
      modules: [{ ...state({}).modules[0], options: [opt('x', { price: 100, scores: { a: 5 } })] }],
    });
    const seed = state({
      dataVersion: 2,
      modules: [
        {
          ...state({}).modules[0],
          options: [opt('x', { price: 80, image: 'images/x.jpg', priceSources: [{ retailer: 'Amazon', price: 80, url: 'u', checkedAt: '2026-06-07' }] })],
        },
      ],
    });
    const merged = mergePricingFromSeed(persisted, seed);
    const o = merged.modules[0].options[0];
    expect(o.price).toBe(80); // refreshed
    expect(o.image).toBe('images/x.jpg'); // refreshed
    expect(o.priceSources?.[0].retailer).toBe('Amazon'); // refreshed
    expect(o.scores.a).toBe(5); // user score preserved
    expect(merged.dataVersion).toBe(2);
  });

  it('does not wipe user pricing when the seed entry has none', () => {
    const persisted = state({
      dataVersion: 1,
      modules: [{ ...state({}).modules[0], options: [opt('x', { price: 100, image: 'images/x.jpg' })] }],
    });
    // seed bumps version but option x carries no image/priceSources of its own
    const seed = state({ dataVersion: 2 });
    const o = mergePricingFromSeed(persisted, seed).modules[0].options[0];
    expect(o.image).toBe('images/x.jpg'); // preserved, not clobbered
  });

  it('appends newly-sourced options the user does not have yet', () => {
    const persisted = state({ dataVersion: 1 });
    const seed = state({
      dataVersion: 2,
      modules: [{ ...state({}).modules[0], options: [opt('x'), opt('y', { price: 42 })] }],
    });
    const ids = mergePricingFromSeed(persisted, seed).modules[0].options.map((o) => o.id);
    expect(ids).toEqual(['x', 'y']);
  });

  it('force merges regardless of version (manual refresh)', () => {
    const persisted = state({ dataVersion: 5, modules: [{ ...state({}).modules[0], options: [opt('x', { price: 100 })] }] });
    const seed = state({ dataVersion: 1, modules: [{ ...state({}).modules[0], options: [opt('x', { price: 70 })] }] });
    const o = mergePricingFromSeed(persisted, seed, true).modules[0].options[0];
    expect(o.price).toBe(70);
  });
});

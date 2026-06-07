import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState } from './types';
import {
  applyPreferences,
  criterionMatchesPriority,
  weightForCriterion,
} from './preferences';

const baseState = (): AppState => JSON.parse(JSON.stringify(seed)) as AppState;

describe('priority → criterion matching', () => {
  it('maps criteria to priorities by keyword', () => {
    expect(criterionMatchesPriority({ id: 'price', label: 'Price' }, 'price')).toBe(true);
    expect(criterionMatchesPriority({ id: 'fit', label: 'Vehicle rear-facing fit' }, 'fit')).toBe(true);
    expect(criterionMatchesPriority({ id: 'safety', label: 'Safety extras' }, 'safety')).toBe(true);
    expect(criterionMatchesPriority({ id: 'price', label: 'Price' }, 'safety')).toBe(false);
  });
});

describe('weightForCriterion', () => {
  const priorities = ['price', 'safety']; // #1 = price, #2 = safety

  it('gives the #1 priority weight 5', () => {
    expect(weightForCriterion({ id: 'price', label: 'Price' }, priorities)).toBe(5);
  });
  it('gives other chosen priorities weight 4', () => {
    expect(weightForCriterion({ id: 'safety', label: 'Safety extras' }, priorities)).toBe(4);
  });
  it('gives unmatched criteria the neutral base weight', () => {
    expect(weightForCriterion({ id: 'weight', label: 'Carrier weight' }, priorities)).toBe(2);
  });
});

describe('applyPreferences', () => {
  it('re-weights criteria from the chosen priorities', () => {
    const next = applyPreferences(baseState(), {
      completed: true,
      priorities: ['price', 'safety'],
    });
    const carSeat = next.modules.find((m) => m.id === 'car-seat')!;
    expect(carSeat.criteria.find((c) => c.id === 'price')!.weight).toBe(5);
    expect(carSeat.criteria.find((c) => c.id === 'safety')!.weight).toBe(4);
    expect(carSeat.criteria.find((c) => c.id === 'weight')!.weight).toBe(2);
  });

  it('personalizes the vehicle-fit criterion label', () => {
    const next = applyPreferences(baseState(), {
      completed: true,
      priorities: [],
      vehicle: 'Toyota Tacoma',
    });
    const carSeat = next.modules.find((m) => m.id === 'car-seat')!;
    expect(carSeat.criteria.find((c) => c.id === 'fit')!.label).toBe('Toyota Tacoma rear-facing fit');
  });

  it('sets the overall budget', () => {
    const next = applyPreferences(baseState(), { completed: true, priorities: [], budget: 1500 });
    expect(next.config.overallBudget).toBe(1500);
  });

  it('records the owned stroller as kept inventory and demotes others', () => {
    const next = applyPreferences(baseState(), {
      completed: true,
      priorities: [],
      ownedStroller: 'BOB Alterrain Pro',
    });
    const kept = next.inventory.filter((i) => i.status === 'keep');
    expect(kept.some((i) => /alterrain pro/i.test(i.name))).toBe(true);
    // The seed's kept Wayfinder is demoted since the parent told us otherwise.
    expect(next.inventory.find((i) => /wayfinder/i.test(i.name))!.status).not.toBe('keep');
  });

  it('does not mutate the input state', () => {
    const state = baseState();
    const before = JSON.stringify(state);
    applyPreferences(state, { completed: true, priorities: ['price'], budget: 999 });
    expect(JSON.stringify(state)).toBe(before);
  });
});

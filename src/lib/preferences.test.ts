import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState } from './types';
import {
  applyOwnedStrollerToState,
  applyPreferences,
  applyVehicleFit,
  criterionMatchesPriority,
  isStrollerModule,
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

describe('isStrollerModule', () => {
  it('matches the stroller module by id or label', () => {
    expect(isStrollerModule({ id: 'stroller', label: 'Stroller' })).toBe(true);
    expect(isStrollerModule({ id: 'mod-x', label: 'Travel Stroller' })).toBe(true);
    expect(isStrollerModule({ id: 'car-seat', label: 'Infant Car Seat' })).toBe(false);
  });
});

// These are the targeted derived effects the Objectives popover applies live —
// each must take effect WITHOUT re-running the priority re-weighting, so a
// parent's hand-tuned criterion weights survive an edit.
describe('applyVehicleFit', () => {
  it('relabels only the fit criterion, leaving weights untouched', () => {
    const state = baseState();
    // Hand-tune a weight the way the popover would, then edit the vehicle.
    const carSeatIn = state.modules.find((m) => m.id === 'car-seat')!;
    carSeatIn.criteria.find((c) => c.id === 'price')!.weight = 5;

    const next = applyVehicleFit(state, 'Honda CR-V');
    const carSeat = next.modules.find((m) => m.id === 'car-seat')!;
    expect(carSeat.criteria.find((c) => c.id === 'fit')!.label).toBe('Honda CR-V rear-facing fit');
    // The hand-tuned weight and every other weight are preserved.
    expect(carSeat.criteria.find((c) => c.id === 'price')!.weight).toBe(5);
    expect(carSeat.criteria.find((c) => c.id === 'fit')!.weight).toBe(5);
    expect(carSeat.criteria.find((c) => c.id === 'weight')!.weight).toBe(4);
  });

  it('re-relabels an already-personalized label when the vehicle changes', () => {
    const once = applyVehicleFit(baseState(), 'Toyota Tacoma');
    const twice = applyVehicleFit(once, 'Subaru Outback');
    const fit = twice.modules.find((m) => m.id === 'car-seat')!.criteria.find((c) => c.id === 'fit')!;
    expect(fit.label).toBe('Subaru Outback rear-facing fit');
  });

  it('is a no-op for a blank name and never mutates its input', () => {
    const state = baseState();
    const before = JSON.stringify(state);
    expect(applyVehicleFit(state, '   ')).toBe(state);
    applyVehicleFit(state, 'Toyota Tacoma');
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('applyOwnedStrollerToState', () => {
  it('records the owned stroller as kept inventory and demotes others, without touching weights', () => {
    const state = baseState();
    const next = applyOwnedStrollerToState(state, 'BOB Alterrain Pro');

    const kept = next.inventory.filter((i) => i.status === 'keep');
    expect(kept.some((i) => /alterrain pro/i.test(i.name))).toBe(true);
    expect(next.inventory.find((i) => /wayfinder/i.test(i.name))!.status).not.toBe('keep');
    // Weights are untouched — this effect only edits inventory.
    expect(next.modules).toEqual(state.modules);
  });

  it('keeps an already-owned stroller (exact name) without adding a duplicate', () => {
    // The seed already keeps "BOB Wayfinder (stroller)" — re-applying it is a no-op.
    const next = applyOwnedStrollerToState(baseState(), 'BOB Wayfinder (stroller)');
    const wayfinders = next.inventory.filter((i) => /wayfinder/i.test(i.name));
    expect(wayfinders).toHaveLength(1);
    expect(wayfinders[0].status).toBe('keep');
  });

  it('is a no-op for a blank name and never mutates its input', () => {
    const state = baseState();
    const before = JSON.stringify(state);
    expect(applyOwnedStrollerToState(state, '  ')).toBe(state);
    applyOwnedStrollerToState(state, 'BOB Alterrain Pro');
    expect(JSON.stringify(state)).toBe(before);
  });
});

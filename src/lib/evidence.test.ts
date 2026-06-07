import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState, Criterion } from './types';
import { criterionEvidence, optionFacts } from './evidence';

const state = seed as unknown as AppState;
const carSeat = state.modules.find((m) => m.id === 'car-seat')!;
const nuna = carSeat.options.find((o) => o.id === 'nuna-pipa-aire-rx')!;
const crit = (id: string): Criterion => carSeat.criteria.find((c) => c.id === id)!;

describe('criterionEvidence', () => {
  it('turns a carrier-weight score into the literal weight in lb', () => {
    expect(criterionEvidence(crit('weight'), nuna)).toBe('6.2 lb carrier');
  });

  it('shows BOB Wayfinder/Alterrain fit behind the compat score', () => {
    expect(criterionEvidence(crit('compat'), nuna)).toBe('Wayfinder ✓ · Alterrain ✓');
  });

  it('shows the safety summary behind the safety score', () => {
    expect(criterionEvidence(crit('safety'), nuna)).toContain('load leg');
  });

  it('shows the best price (and retailer) behind the price score', () => {
    // Lowest in-stock source for the Nuna is $650 at Nordstrom.
    expect(criterionEvidence(crit('price'), nuna)).toBe('$650 at Nordstrom');
  });

  it('returns null when no attribute maps to the criterion', () => {
    expect(criterionEvidence(crit('fit'), nuna)).toBeNull();
  });

  it('keeps mapping after a criterion is renamed (matches by label keyword)', () => {
    const renamed: Criterion = { id: 'x1', label: 'Carrier weight (lbs)', weight: 4 };
    expect(criterionEvidence(renamed, nuna)).toBe('6.2 lb carrier');
  });
});

describe('optionFacts', () => {
  it('renders known attributes with friendly labels and units', () => {
    const facts = optionFacts(nuna);
    const byLabel = Object.fromEntries(facts.map((f) => [f.label, f.value]));
    expect(byLabel['Carrier weight']).toBe('6.2 lb');
    expect(byLabel['Fits BOB Wayfinder']).toBe('Yes');
    expect(byLabel['Fits BOB Alterrain']).toBe('Yes');
  });
});

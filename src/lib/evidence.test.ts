import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState, Criterion } from './types';
import { criterionEvidence, optionFacts, optionSummary } from './evidence';

const state = seed as unknown as AppState;
const carSeat = state.modules.find((m) => m.id === 'car-seat')!;
const nuna = carSeat.options.find((o) => o.id === 'nuna-pipa-aire-rx')!;
const crit = (id: string): Criterion => carSeat.criteria.find((c) => c.id === id)!;

const stroller = state.modules.find((m) => m.id === 'stroller')!;
const wayfinder = stroller.options.find((o) => o.id === 'bob-wayfinder-opt')!;
const alterrainPro = stroller.options.find((o) => o.id === 'bob-alterrain-pro-opt')!;
const sCrit = (id: string): Criterion => stroller.criteria.find((c) => c.id === id)!;

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

  it('shows the rear-facing footprint length behind the Tacoma-fit score', () => {
    expect(criterionEvidence(crit('fit'), nuna)).toBe('27.25 in rear-facing footprint');
  });

  it('returns null when no attribute maps to the criterion', () => {
    const unmapped: Criterion = { id: 'aesthetics', label: 'Looks', weight: 1 };
    expect(criterionEvidence(unmapped, nuna)).toBeNull();
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
    expect(byLabel['Rear-facing length']).toBe('27.25 in');
    expect(byLabel['Fits BOB Wayfinder']).toBe('Yes');
    expect(byLabel['Fits BOB Alterrain']).toBe('Yes');
  });
});

describe('optionSummary', () => {
  it('summarises weight + BOB fit as compact toned chips', () => {
    const chips = optionSummary(nuna);
    const byKey = Object.fromEntries(chips.map((c) => [c.key, c]));
    expect(byKey.carrierLb).toMatchObject({ text: '6.2 lb', tone: 'neutral' });
    expect(byKey.rearFacingLengthIn).toMatchObject({ text: '27.25" long', tone: 'neutral' });
    expect(byKey.fitsWayfinder).toMatchObject({ text: 'Wayfinder ✓', tone: 'good' });
    expect(byKey.fitsAlterrain).toMatchObject({ text: 'Alterrain ✓', tone: 'good' });
  });

  it('marks a missing BOB fit as a bad-toned ✗ chip', () => {
    const clek = carSeat.options.find((o) => o.id === 'clek-liing')!;
    const byKey = Object.fromEntries(optionSummary(clek).map((c) => [c.key, c]));
    expect(byKey.fitsWayfinder).toMatchObject({ text: 'Wayfinder ✗', tone: 'bad' });
  });

  it('omits the long safety prose from the compact summary', () => {
    expect(optionSummary(nuna).some((c) => c.key === 'safety')).toBe(false);
  });

  it('summarises a stroller as weight + suspension + adapter-ease chips', () => {
    const byKey = Object.fromEntries(optionSummary(wayfinder).map((c) => [c.key, c]));
    expect(byKey.weightLb).toMatchObject({ text: '31.1 lb', tone: 'neutral' });
    expect(byKey.suspension).toMatchObject({ text: 'Independent dual', tone: 'neutral' });
    // A single universal adapter reads as an ease win (good tone).
    expect(byKey.adapterSystem).toMatchObject({ text: '1 universal adapter', tone: 'good' });
  });

  it('marks a brand-specific adapter ecosystem as a neutral chip', () => {
    const byKey = Object.fromEntries(optionSummary(alterrainPro).map((c) => [c.key, c]));
    expect(byKey.adapterSystem).toMatchObject({ text: 'Brand adapters', tone: 'neutral' });
  });
});

describe('criterionEvidence (stroller)', () => {
  it('shows suspension + tires behind the ride/terrain score', () => {
    expect(criterionEvidence(sCrit('ride'), wayfinder)).toBe(
      'Independent dual · 12″ front / 16″ rear air-filled',
    );
  });

  it('shows weight + folded size behind the fold-size score', () => {
    expect(criterionEvidence(sCrit('foldsize'), wayfinder)).toBe(
      '31.1 lb, folds to 16.5 × 22 × 32.5 in',
    );
  });

  it('shows the adapter system behind the adapter-ease score', () => {
    expect(criterionEvidence(sCrit('adapterease'), wayfinder)).toContain('universal adapter');
  });

  it('shows the best in-stock price behind the price score', () => {
    expect(criterionEvidence(sCrit('stprice'), wayfinder)).toBe('$679.99 at ANB Baby');
  });
});

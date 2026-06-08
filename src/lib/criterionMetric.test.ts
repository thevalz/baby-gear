import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState, Criterion } from './types';
import { criterionMetric, metricFails, metricMargin } from './criterionMetric';

const state = seed as unknown as AppState;
const carSeat = state.modules.find((m) => m.id === 'car-seat')!;
const nuna = carSeat.options.find((o) => o.id === 'nuna-pipa-aire-rx')!;
const crit = (id: string): Criterion => carSeat.criteria.find((c) => c.id === id)!;

describe('criterionMetric', () => {
  it('reads carrier weight as a lower-is-better pound value', () => {
    const m = criterionMetric(crit('weight'), nuna)!;
    expect(m.value).toBe(6.2);
    expect(m.dir).toBe(-1);
    expect(m.format(m.value)).toBe('6.2 lb');
  });

  it('reads the rear-facing footprint and attaches the back-seat threshold', () => {
    const m = criterionMetric(crit('fit'), nuna, { backSeatLengthIn: 28 })!;
    expect(m.value).toBe(27.25);
    expect(m.threshold).toEqual({ value: 28, label: 'your back seat 28″', passIf: 'lte' });
  });

  it('reads weight capacity as higher-is-better (not carrier mass)', () => {
    const m = criterionMetric(crit('growthweight'), nuna)!;
    expect(m.dir).toBe(1);
    expect(m.value).toBe(nuna.attributes.maxWeightLb);
  });

  it('returns null for categorical longevity', () => {
    expect(criterionMetric(crit('growthlongevity'), nuna)).toBeNull();
  });

  it('attaches a budget threshold to price', () => {
    const m = criterionMetric(crit('price'), nuna, { budget: 500 })!;
    expect(m.value).toBe(650); // lowest in-stock source
    expect(m.threshold?.passIf).toBe('lte');
  });

  it('omits thresholds when the visitor gave no limits', () => {
    expect(criterionMetric(crit('fit'), nuna)!.threshold).toBeUndefined();
    expect(criterionMetric(crit('price'), nuna)!.threshold).toBeUndefined();
  });
});

describe('metricFails / metricMargin', () => {
  it('passes when the footprint fits the back seat, with the spare margin', () => {
    const m = criterionMetric(crit('fit'), nuna, { backSeatLengthIn: 28 })!;
    expect(metricFails(m)).toBe(false);
    expect(metricMargin(m)).toBe('0.75 in to spare');
  });

  it('fails when the footprint exceeds the back seat', () => {
    const m = criterionMetric(crit('fit'), nuna, { backSeatLengthIn: 27 })!;
    expect(metricFails(m)).toBe(true);
    expect(metricMargin(m)).toBe('over by 0.25 in');
  });

  it('flags a price over budget', () => {
    const m = criterionMetric(crit('price'), nuna, { budget: 500 })!;
    expect(metricFails(m)).toBe(true);
    expect(metricMargin(m)).toBe('over by $150');
  });
});

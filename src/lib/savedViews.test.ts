import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState, Module } from './types';
import { bestPrice } from './scoring';
import { criterionMetric, metricFails, type MetricContext } from './criterionMetric';
import { criterionMatchesPriority } from './preferences';
import { availableViews, filterByView, TOP_N } from './savedViews';

const state = () => JSON.parse(JSON.stringify(seed)) as AppState;
const carSeat = (): Module => state().modules.find((m) => m.id === 'car-seat')!;
const ctx: MetricContext = { backSeatLengthIn: 28, budget: 500 };

describe('filterByView', () => {
  it('"all" keeps every option', () => {
    const m = carSeat();
    expect(filterByView(m, 'all', ctx)).toHaveLength(m.options.length);
  });

  it('"budget" keeps only options at or under the module budget', () => {
    const m = carSeat(); // budget 500
    const kept = filterByView(m, 'budget', ctx);
    expect(kept.length).toBeLessThan(m.options.length); // the seed has options over $500
    expect(kept.every((o) => bestPrice(o) <= m.budget)).toBe(true);
  });

  it('"fit" keeps only options that pass the back-seat length', () => {
    const m = carSeat();
    const fc = m.criteria.find((c) => criterionMatchesPriority(c, 'fit'))!;
    const kept = filterByView(m, 'fit', ctx);
    expect(kept.length).toBeLessThan(m.options.length); // some seats are too long for 28"
    expect(
      kept.every((o) => {
        const metric = criterionMetric(fc, o, ctx);
        return metric ? !metricFails(metric) : true;
      }),
    ).toBe(true);
  });

  it('"top" keeps the N best-ranked options', () => {
    expect(filterByView(carSeat(), 'top', ctx)).toHaveLength(TOP_N);
  });

  it('"budget" is a no-op when the module has no budget', () => {
    const m = { ...carSeat(), budget: 0 };
    expect(filterByView(m, 'budget', ctx)).toHaveLength(m.options.length);
  });

  it('"fit" is a no-op when no back-seat length is set', () => {
    const m = carSeat();
    expect(filterByView(m, 'fit', { budget: 500 })).toHaveLength(m.options.length);
  });
});

describe('availableViews', () => {
  it('offers all four views for the car-seat module with full context', () => {
    const keys = availableViews(carSeat(), ctx).map((v) => v.key);
    expect(keys).toEqual(['all', 'budget', 'fit', 'top']);
  });

  it('omits "fit" without a back-seat length', () => {
    const keys = availableViews(carSeat(), { budget: 500 }).map((v) => v.key);
    expect(keys).not.toContain('fit');
  });

  it('omits "budget" when the module budget is 0', () => {
    const keys = availableViews({ ...carSeat(), budget: 0 }, ctx).map((v) => v.key);
    expect(keys).not.toContain('budget');
  });

  it('omits "top" when there are N or fewer options', () => {
    const m = { ...carSeat(), options: carSeat().options.slice(0, TOP_N) };
    const keys = availableViews(m, ctx).map((v) => v.key);
    expect(keys).not.toContain('top');
  });

  it('carries a live count on each view', () => {
    const all = availableViews(carSeat(), ctx).find((v) => v.key === 'all')!;
    expect(all.count).toBe(carSeat().options.length);
  });
});

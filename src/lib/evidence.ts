// Turns an option's free-form `attributes` into human-readable facts and maps
// each scoring criterion to the *literal value that justifies its score*. This
// is what lets the drill-down page say "Carrier weight: 5 → 6.2 lb" instead of
// leaving a bare, meaningless number next to the requirement.

import type { Criterion, Option } from './types';
import { bestPrice, bestSource, formatMoney } from './scoring';

/** A single labelled fact derived from an option's attributes. */
export interface Fact {
  key: string;
  label: string;
  value: string;
}

const yesNo = (v: unknown): string => (v ? 'Yes' : 'No');

/**
 * Friendly label + value formatter for each known attribute key. Keys not
 * listed here still surface (title-cased) so user-added attributes appear too.
 */
const ATTRIBUTE_META: Record<string, { label: string; format: (v: unknown) => string }> = {
  carrierLb: { label: 'Carrier weight', format: (v) => `${v} lb` },
  fitsWayfinder: { label: 'Fits BOB Wayfinder', format: yesNo },
  fitsAlterrain: { label: 'Fits BOB Alterrain', format: yesNo },
  safety: { label: 'Safety features', format: (v) => String(v) },
  brand: { label: 'Brand', format: (v) => String(v) },
  type: { label: 'Type', format: (v) => String(v) },
  owned: { label: 'Already owned', format: yesNo },
};

/** Bookkeeping attributes that are not worth showing to a human. */
const HIDDEN_ATTRIBUTES = new Set(['carrierLbVerify']);

const titleCase = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const formatValue = (key: string, value: unknown): string => {
  const meta = ATTRIBUTE_META[key];
  if (meta) return meta.format(value);
  if (typeof value === 'boolean') return yesNo(value);
  return String(value);
};

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === '';

/** Every surfaceable attribute of an option as a labelled fact (skips empties). */
export function optionFacts(option: Option): Fact[] {
  const attrs = (option.attributes ?? {}) as Record<string, unknown>;
  return Object.entries(attrs)
    .filter(([key, value]) => !HIDDEN_ATTRIBUTES.has(key) && !isEmpty(value))
    .map(([key, value]) => ({
      key,
      label: ATTRIBUTE_META[key]?.label ?? titleCase(key),
      value: formatValue(key, value),
    }));
}

/** A compact, colour-toned attribute chip for the comparison table. */
export interface SummaryChip {
  key: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

/**
 * The handful of high-signal attributes worth showing inline in the main
 * comparison table — short enough to fit as chips (the long `safety` text and
 * other prose live on the drill-down page, not here).
 */
export function optionSummary(option: Option): SummaryChip[] {
  const a = option.attributes ?? {};
  const chips: SummaryChip[] = [];

  if (a.carrierLb != null) {
    chips.push({ key: 'carrierLb', text: `${a.carrierLb} lb`, tone: 'neutral' });
  }
  if (a.fitsWayfinder != null) {
    chips.push({
      key: 'fitsWayfinder',
      text: `Wayfinder ${a.fitsWayfinder ? '✓' : '✗'}`,
      tone: a.fitsWayfinder ? 'good' : 'bad',
    });
  }
  if (a.fitsAlterrain != null) {
    chips.push({
      key: 'fitsAlterrain',
      text: `Alterrain ${a.fitsAlterrain ? '✓' : '✗'}`,
      tone: a.fitsAlterrain ? 'good' : 'bad',
    });
  }
  if (a.brand) chips.push({ key: 'brand', text: String(a.brand), tone: 'neutral' });
  if (a.type) chips.push({ key: 'type', text: String(a.type), tone: 'neutral' });
  if (a.owned) chips.push({ key: 'owned', text: 'Owned', tone: 'good' });

  return chips;
}

/**
 * The literal value(s) that justify an option's score on one criterion — e.g.
 * for a "Carrier weight" requirement this returns "6.2 lb carrier", so a score
 * of 5 is no longer a bare number. Matches by criterion id/label keywords so it
 * keeps working as users rename criteria. Returns null when nothing maps.
 */
export function criterionEvidence(criterion: Criterion, option: Option): string | null {
  const a = option.attributes ?? {};
  const hay = `${criterion.id} ${criterion.label}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => hay.includes(n));

  // Carrier weight / mass.
  if (has('weight', 'mass') && a.carrierLb != null) {
    return `${a.carrierLb} lb carrier`;
  }

  // Stroller / BOB adapter compatibility.
  if (has('compat', 'stroller', 'bob', 'adapter')) {
    const parts: string[] = [];
    if (a.fitsWayfinder != null) parts.push(`Wayfinder ${a.fitsWayfinder ? '✓' : '✗'}`);
    if (a.fitsAlterrain != null) parts.push(`Alterrain ${a.fitsAlterrain ? '✓' : '✗'}`);
    if (parts.length) return parts.join(' · ');
  }

  // Safety extras.
  if (has('safety') && a.safety) return a.safety;

  // Price.
  if (has('price', 'cost')) {
    const src = bestSource(option);
    return `${formatMoney(bestPrice(option))}${src ? ` at ${src.retailer}` : ''}`;
  }

  return null;
}

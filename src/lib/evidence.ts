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
  rearFacingLengthIn: { label: 'Rear-facing length', format: (v) => `${v} in` },
  maxHeightIn: { label: 'Max child height', format: (v) => `${v} in` },
  maxWeightLb: { label: 'Max child weight', format: (v) => `${v} lb` },
  convertsToToddler: { label: 'Extends to toddler', format: yesNo },
  maxAgeMonths: { label: 'Max age', format: (v) => `${v} mo` },
  fitsWayfinder: { label: 'Fits BOB Wayfinder', format: yesNo },
  fitsAlterrain: { label: 'Fits BOB Alterrain', format: yesNo },
  safety: { label: 'Safety features', format: (v) => String(v) },
  brand: { label: 'Brand', format: (v) => String(v) },
  type: { label: 'Type', format: (v) => String(v) },
  owned: { label: 'Already owned', format: yesNo },
  weightLb: { label: 'Stroller weight', format: (v) => `${v} lb` },
  foldedDimsIn: { label: 'Folded size', format: (v) => String(v) },
  tires: { label: 'Tires', format: (v) => String(v) },
  suspension: { label: 'Suspension', format: (v) => String(v) },
  maxChildLb: { label: 'Max child weight', format: (v) => `${v} lb` },
  adapterSystem: { label: 'Car-seat adapter', format: (v) => String(v) },
  // Clek-compatible stroller + adapter attributes (city/compact roster).
  unfoldedDimsIn: { label: 'Unfolded size', format: (v) => String(v) },
  brakeType: { label: 'Brake', format: (v) => String(v) },
  safetyStandards: { label: 'Safety standards', format: (v) => String(v) },
  foldType: { label: 'Fold', format: (v) => String(v) },
  fitsLiing: { label: 'Fits Clek Liing', format: yesNo },
  clekAdapter: { label: 'Clek Liing adapter', format: (v) => String(v) },
  partNumber: { label: 'Part #', format: (v) => String(v) },
  madeBy: { label: 'Made by', format: (v) => String(v) },
  seatBrands: { label: 'Fits car seats', format: (v) => String(v) },
  forStrollers: { label: 'Fits strollers', format: (v) => String(v) },
  discontinued: { label: 'Discontinued', format: yesNo },
  safetySummary: { label: 'Safety', format: (v) => String(v) },
  brakePower: { label: 'Brake power', format: (v) => String(v) },
};

/**
 * Bookkeeping attributes not worth showing to a human. The atomic dimension
 * fields (foldLenIn, …) drive the sortable grid columns but are redundant on the
 * drill-down, which shows the readable combined `foldedDimsIn`/`unfoldedDimsIn`.
 */
const HIDDEN_ATTRIBUTES = new Set([
  'carrierLbVerify',
  'foldLenIn', 'foldWidIn', 'foldHtIn', 'openLenIn', 'openWidIn', 'openHtIn',
  'sourceUrl', 'safetyRecall', 'jpma',
]);

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
  if (a.rearFacingLengthIn != null) {
    chips.push({ key: 'rearFacingLengthIn', text: `${a.rearFacingLengthIn}" long`, tone: 'neutral' });
  }
  // Growth / longevity — how long the seat fits the child as he grows.
  if (a.maxHeightIn != null) {
    chips.push({ key: 'maxHeightIn', text: `fits to ${a.maxHeightIn}"`, tone: a.maxHeightIn >= 35 ? 'good' : 'neutral' });
  }
  if (a.maxWeightLb != null) {
    chips.push({ key: 'maxWeightLb', text: `${a.maxWeightLb} lb max`, tone: a.maxWeightLb >= 35 ? 'good' : 'neutral' });
  }
  if (a.convertsToToddler) {
    chips.push({ key: 'convertsToToddler', text: 'To toddler', tone: 'good' });
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
  // Stroller high-signal facts (mirror the stroller criteria: ride, fold/weight,
  // adapter ease). Long prose like full tire/dimension specs lives on the
  // drill-down page; these chips stay short.
  if (a.weightLb != null) {
    chips.push({ key: 'weightLb', text: `${a.weightLb} lb`, tone: 'neutral' });
  }
  if (a.suspension) {
    chips.push({ key: 'suspension', text: String(a.suspension), tone: 'neutral' });
  }
  if (a.adapterSystem) {
    const universal = /universal/i.test(String(a.adapterSystem));
    chips.push({
      key: 'adapterSystem',
      text: universal ? '1 universal adapter' : 'Brand adapters',
      tone: universal ? 'good' : 'neutral',
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

  // ── Growth / longevity (how long the seat keeps fitting the child) ──
  // These come first because "Weight capacity" also contains "weight" and would
  // otherwise be captured by the carrier-weight rule below.
  // Outgrow-by-height — the binding constraint for infant seats.
  if (has('height', 'headroom', 'outgrow') && a.maxHeightIn != null) {
    return `fits to ${a.maxHeightIn} in tall`;
  }
  // Weight capacity — the max child weight the seat accommodates.
  if (has('capacity') && a.maxWeightLb != null) {
    return `up to ${a.maxWeightLb} lb`;
  }
  // Infant→toddler longevity — convertibility class, with realistic duration.
  if (has('longevity', 'toddler', 'grows')) {
    if (a.convertsToToddler) {
      return `rear-faces into toddlerhood${a.maxAgeMonths ? ` (~${a.maxAgeMonths} mo)` : ''}`;
    }
    const caps = [
      a.maxHeightIn != null ? `${a.maxHeightIn} in` : null,
      a.maxWeightLb != null ? `${a.maxWeightLb} lb` : null,
    ]
      .filter(Boolean)
      .join(' / ');
    return caps ? `infant bucket (to ${caps})` : 'infant bucket seat';
  }

  // Carrier weight / mass.
  if (has('weight', 'mass') && a.carrierLb != null) {
    return `${a.carrierLb} lb carrier`;
  }

  // Rear-facing footprint — the length that drives tight-vehicle (e.g. Tacoma) fit.
  if (has('fit', 'tacoma', 'footprint', 'rear-facing', 'length') && a.rearFacingLengthIn != null) {
    return `${a.rearFacingLengthIn} in rear-facing footprint`;
  }

  // Stroller ride / terrain — the suspension + tire setup behind the score.
  if (has('ride', 'terrain') && (a.suspension || a.tires)) {
    return [a.suspension, a.tires].filter(Boolean).join(' · ');
  }

  // Stroller weight & fold size.
  if (has('fold', 'foldsize', 'size', 'weight') && a.weightLb != null) {
    const folded = a.foldedDimsIn ? `, folds to ${a.foldedDimsIn}` : '';
    return `${a.weightLb} lb${folded}`;
  }

  // Stroller / BOB adapter compatibility (car seat: per-seat fit flags;
  // stroller: the adapter system that drives adapter ease).
  if (has('compat', 'stroller', 'bob', 'adapter', 'ease')) {
    const parts: string[] = [];
    if (a.fitsWayfinder != null) parts.push(`Wayfinder ${a.fitsWayfinder ? '✓' : '✗'}`);
    if (a.fitsAlterrain != null) parts.push(`Alterrain ${a.fitsAlterrain ? '✓' : '✗'}`);
    if (parts.length) return parts.join(' · ');
    if (a.adapterSystem) return String(a.adapterSystem);
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

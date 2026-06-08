// Numeric companion to evidence.ts. Where `criterionEvidence` returns the human
// *string* behind a score ("6.2 lb carrier"), `criterionMetric` returns the
// underlying *number* plus its direction and — when the visitor has told us —
// their personal threshold (back-seat length, module budget). That's what lets
// the matrix flag a real fail in red and the popover plot a value on the actual
// cohort range against the user's own limit, instead of a bare 0–5 score.

import type { Criterion, Option } from './types';
import { bestPrice, formatMoney } from './scoring';

export interface CriterionThreshold {
  /** The visitor's limit on this metric (e.g. their back-seat length). */
  value: number;
  /** Short label for the threshold marker, e.g. "your back seat 28″". */
  label: string;
  /** Passing means value ≤ threshold ('lte') or value ≥ threshold ('gte'). */
  passIf: 'lte' | 'gte';
}

export interface CriterionMetric {
  /** The option's measured value for this criterion. */
  value: number;
  /** Renders a value with units, e.g. n => `${n} in`. */
  format: (n: number) => string;
  /** +1 when higher is better, -1 when lower is better. */
  dir: 1 | -1;
  threshold?: CriterionThreshold;
}

/** Personal limits the visitor supplied, threaded in from preferences / module. */
export interface MetricContext {
  /** Usable rear-facing back-seat length, inches (drives the fit threshold). */
  backSeatLengthIn?: number;
  /** Budget this metric's price is checked against (the module budget). */
  budget?: number;
}

const inches = (n: number) => `${n} in`;
const pounds = (n: number) => `${n} lb`;

/**
 * Map a criterion to its numeric measurement for one option. Ordering mirrors
 * `criterionEvidence` exactly so the number and the displayed string always
 * agree (e.g. "Weight capacity" resolves to max child weight, not carrier mass).
 * Returns null for inherently non-numeric criteria (longevity, compat, safety).
 */
export function criterionMetric(
  criterion: Criterion,
  option: Option,
  ctx: MetricContext = {},
): CriterionMetric | null {
  const a = option.attributes ?? {};
  const hay = `${criterion.id} ${criterion.label}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => hay.includes(n));

  // Growth / longevity first (so "capacity"/"height" win before "weight").
  if (has('height', 'headroom', 'outgrow') && a.maxHeightIn != null) {
    return { value: a.maxHeightIn, format: inches, dir: 1 };
  }
  if (has('capacity') && a.maxWeightLb != null) {
    return { value: a.maxWeightLb, format: pounds, dir: 1 };
  }
  // Infant→toddler longevity is categorical — no meaningful number.
  if (has('longevity', 'toddler', 'grows')) return null;

  // Carrier weight / mass (lower is better).
  if (has('weight', 'mass') && a.carrierLb != null) {
    return { value: a.carrierLb, format: pounds, dir: -1 };
  }

  // Rear-facing footprint — checked against the visitor's back-seat length.
  if (has('fit', 'tacoma', 'footprint', 'rear-facing', 'length') && a.rearFacingLengthIn != null) {
    return {
      value: a.rearFacingLengthIn,
      format: inches,
      dir: -1,
      threshold:
        ctx.backSeatLengthIn && ctx.backSeatLengthIn > 0
          ? { value: ctx.backSeatLengthIn, label: `your back seat ${ctx.backSeatLengthIn}″`, passIf: 'lte' }
          : undefined,
    };
  }

  // Stroller weight & fold size (lower is better).
  if (has('fold', 'foldsize', 'size', 'weight') && a.weightLb != null) {
    return { value: a.weightLb, format: pounds, dir: -1 };
  }

  // Price — checked against the module budget.
  if (has('price', 'cost')) {
    return {
      value: bestPrice(option),
      format: formatMoney,
      dir: -1,
      threshold:
        ctx.budget && ctx.budget > 0
          ? { value: ctx.budget, label: `budget ${formatMoney(ctx.budget)}`, passIf: 'lte' }
          : undefined,
    };
  }

  return null;
}

/** True when the option violates the visitor's threshold for this metric. */
export function metricFails(m: CriterionMetric): boolean {
  if (!m.threshold) return false;
  return m.threshold.passIf === 'lte' ? m.value > m.threshold.value : m.value < m.threshold.value;
}

/** Human margin vs. the threshold, e.g. "0.75 in to spare" or "over by $150". */
export function metricMargin(m: CriterionMetric): string | null {
  if (!m.threshold) return null;
  const diff = Math.round((m.value - m.threshold.value) * 100) / 100;
  const mag = m.format(Math.abs(diff));
  if (m.threshold.passIf === 'lte') {
    return diff > 0 ? `over by ${mag}` : `${mag} to spare`;
  }
  return diff < 0 ? `under by ${mag}` : `${mag} of headroom`;
}

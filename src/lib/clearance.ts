// Back-seat clearance check for rear-facing infant seats.
//
// A seat's `rearFacingLengthIn` is its *installed footprint* — how far it juts
// out when reclined rear-facing. Compared against the usable length of a back
// seat, it answers the question that drives the most car-seat returns: "will it
// actually fit behind my driver's seat?" This is an acknowledged approximation
// — real clearance also depends on where the front seat is set and the recline
// angle — so the UI pairs it with a measuring note and a small safety margin.

import type { Option } from './types';

/** Recommended breathing room (in) beyond the bare footprint — recline + install slack. */
export const CLEARANCE_MARGIN_IN = 1.5;

export interface ClearanceResult {
  /** Usable back-seat length the parent measured (in). */
  available: number;
  /** The seat's rear-facing footprint (in). */
  needed: number;
  /** available − needed, rounded to 0.1 in (can be negative). */
  marginIn: number;
  /** True when the footprint fits at all (margin ≥ 0). */
  fits: boolean;
  /** True when it fits with the recommended breathing room. */
  fitsComfortably: boolean;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Clearance for one option given the measured back-seat length, or null when we
 * lack the seat's footprint or the parent hasn't entered a measurement.
 */
export function clearanceFor(option: Option, availableLengthIn?: number): ClearanceResult | null {
  const needed = option.attributes?.rearFacingLengthIn;
  if (needed == null || !availableLengthIn || availableLengthIn <= 0) return null;
  const marginIn = round1(availableLengthIn - needed);
  return {
    available: availableLengthIn,
    needed,
    marginIn,
    fits: marginIn >= 0,
    fitsComfortably: marginIn >= CLEARANCE_MARGIN_IN,
  };
}

/** A short, human verdict for a clearance result (null when not applicable). */
export function clearanceMessage(option: Option, availableLengthIn?: number): { good: boolean; text: string } | null {
  const c = clearanceFor(option, availableLengthIn);
  if (!c) return null;
  if (!c.fits) {
    return { good: false, text: `Too long for your ${c.available}" back seat by ${Math.abs(c.marginIn)}".` };
  }
  if (!c.fitsComfortably) {
    return { good: true, text: `Fits your ${c.available}" back seat, but tight (${c.marginIn}" to spare).` };
  }
  return { good: true, text: `Fits your ${c.available}" back seat with ${c.marginIn}" to spare.` };
}

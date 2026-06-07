import { describe, expect, it } from 'vitest';
import type { Option } from './types';
import { clearanceFor, clearanceMessage } from './clearance';

const seat = (rearFacingLengthIn?: number): Option => ({
  id: 'x',
  moduleId: 'car-seat',
  name: 'Test Seat',
  price: 0,
  attributes: rearFacingLengthIn != null ? { rearFacingLengthIn } : {},
  scores: {},
});

describe('clearanceFor', () => {
  it('returns null without a footprint or a measurement', () => {
    expect(clearanceFor(seat(undefined), 28)).toBeNull();
    expect(clearanceFor(seat(26), undefined)).toBeNull();
    expect(clearanceFor(seat(26), 0)).toBeNull();
  });

  it('computes a positive margin when it fits comfortably', () => {
    const c = clearanceFor(seat(24), 28)!;
    expect(c.marginIn).toBe(4);
    expect(c.fits).toBe(true);
    expect(c.fitsComfortably).toBe(true);
  });

  it('flags a tight-but-fits case (under the safety margin)', () => {
    const c = clearanceFor(seat(27), 28)!;
    expect(c.fits).toBe(true);
    expect(c.fitsComfortably).toBe(false);
  });

  it('flags a non-fit with a negative margin', () => {
    const c = clearanceFor(seat(30), 28)!;
    expect(c.fits).toBe(false);
    expect(c.marginIn).toBe(-2);
  });
});

describe('clearanceMessage', () => {
  it('warns when the seat is too long', () => {
    const m = clearanceMessage(seat(30), 28)!;
    expect(m.good).toBe(false);
    expect(m.text).toContain('Too long');
  });

  it('confirms a comfortable fit', () => {
    const m = clearanceMessage(seat(24), 28)!;
    expect(m.good).toBe(true);
    expect(m.text).toContain('to spare');
  });
});

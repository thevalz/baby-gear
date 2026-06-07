import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState } from './types';
import { computeCompatibilityFlags } from './compatibility';

const baseState = () => JSON.parse(JSON.stringify(seed)) as AppState;

/** Force the car-seat module to select a specific option by name. */
function pickCarSeat(state: AppState, name: string): AppState {
  const cs = state.modules.find((m) => m.id === 'car-seat')!;
  cs.selectedOptionId = cs.options.find((o) => o.name === name)!.id;
  return state;
}

describe('compatibility flags (car seat ↔ stroller)', () => {
  it('green when the pick fits the owned Wayfinder and considered Alterrain', () => {
    // Default top pick is the Cybex Aton G Swivel (fits both).
    const flags = computeCompatibilityFlags(baseState());
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('green');
    expect(flags[0].message).toContain('fits every stroller you own or consider');
  });

  it('red when the pick does not fit the owned Wayfinder, suggesting the Alterrain', () => {
    // Graco: fitsWayfinder=false, fitsAlterrain=true.
    const flags = computeCompatibilityFlags(pickCarSeat(baseState(), 'Graco SnugRide 35 Lite LX'));
    const red = flags.find((f) => f.severity === 'red');
    expect(red).toBeTruthy();
    expect(red!.message).toBe("Selected seat doesn't fit your Wayfinder — needs Alterrain.");
    // It fits the considered Alterrain, so no yellow flag for that target.
    expect(flags.some((f) => f.severity === 'yellow')).toBe(false);
  });

  it('flags both targets when the pick fits neither (no alternative to suggest)', () => {
    // Clek Liing: fitsWayfinder=false, fitsAlterrain=false (on neither BOB list).
    const flags = computeCompatibilityFlags(pickCarSeat(baseState(), 'Clek Liing'));
    const red = flags.find((f) => f.severity === 'red');
    const yellow = flags.find((f) => f.severity === 'yellow');
    expect(red!.message).toBe("Selected seat doesn't fit your Wayfinder.");
    expect(yellow!.message).toBe("Selected seat won't fit the Alterrain you're considering.");
    expect(flags.some((f) => f.severity === 'green')).toBe(false);
  });
});

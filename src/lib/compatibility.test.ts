import { describe, expect, it } from 'vitest';
import seed from '../data/seed.json';
import type { AppState } from './types';
import {
  cellFit,
  compatibilityMatrices,
  computeCompatibilityFlags,
} from './compatibility';

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

describe('compatibility matrix (browsable fit grid)', () => {
  const matrixOf = (state: AppState) => {
    const ms = compatibilityMatrices(state);
    expect(ms).toHaveLength(1);
    return ms[0];
  };
  const seat = (m: ReturnType<typeof matrixOf>, name: string) =>
    m.sourceModule.options.find((o) => o.name === name)!;
  const col = (m: ReturnType<typeof matrixOf>, nameIncludes: string) =>
    m.columns.find((c) => c.option.name.includes(nameIncludes))!;

  it('exposes every car seat × every stroller', () => {
    const m = matrixOf(baseState());
    expect(m.sourceModule.id).toBe('car-seat');
    expect(m.columns.map((c) => c.option.name)).toEqual([
      'BOB Wayfinder',
      'BOB Alterrain',
      'BOB Alterrain Pro',
    ]);
  });

  it('maps each stroller column to the fit attribute that drives it', () => {
    const m = matrixOf(baseState());
    expect(col(m, 'Wayfinder').fitAttribute).toBe('fitsWayfinder');
    // Both Alterrain and Alterrain Pro resolve to the Alterrain target.
    expect(col(m, 'Alterrain').fitAttribute).toBe('fitsAlterrain');
    expect(col(m, 'Alterrain Pro').fitAttribute).toBe('fitsAlterrain');
  });

  it('flags the owned stroller (kept inventory) regardless of name suffix', () => {
    const m = matrixOf(baseState());
    expect(col(m, 'Wayfinder').owned).toBe(true); // "BOB Wayfinder (stroller)" is kept
    expect(col(m, 'Alterrain').owned).toBe(false);
  });

  it('reports fit per cell as true / false / unknown', () => {
    const m = matrixOf(baseState());
    const graco = seat(m, 'Graco SnugRide 35 Lite LX'); // Wayfinder=false, Alterrain=true
    expect(cellFit(graco, col(m, 'Wayfinder'))).toBe(false);
    expect(cellFit(graco, col(m, 'Alterrain Pro'))).toBe(true);

    const cybex = seat(m, 'Cybex Aton G Swivel'); // fits both
    expect(cellFit(cybex, col(m, 'Wayfinder'))).toBe(true);
  });
});

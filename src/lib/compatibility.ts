import type { AppState } from './types';
import { selectedOption } from './scoring';

/**
 * Generic, data-driven cross-module compatibility.
 *
 * A relation links a *source* module (whose selected pick we evaluate) to a
 * *target* module (the things the pick must be compatible with). Each target is
 * matched against your inventory / considered options by name substring, and a
 * boolean attribute on the source option says whether the pick fits it.
 *
 * To add a new relationship (e.g. stroller ↔ travel-system base), just append a
 * new entry to `compatibilityMap` — no engine code changes required.
 */

export type FlagSeverity = 'red' | 'yellow' | 'green';

export interface CompatTarget {
  /** Short display name, also used in messages, e.g. "Wayfinder". */
  label: string;
  /** Case-insensitive substring matched against inventory / option names. */
  match: string;
  /** Boolean attribute on the source option that signals fit, e.g. "fitsWayfinder". */
  fitAttribute: string;
}

export interface CompatRelation {
  id: string;
  label: string;
  sourceModuleId: string;
  targetModuleId: string;
  /** Noun for the source pick in messages, e.g. "seat". */
  sourceNoun: string;
  /** Noun for a target in messages, e.g. "stroller". */
  targetNoun: string;
  targets: CompatTarget[];
}

export interface CompatFlag {
  severity: FlagSeverity;
  message: string;
  relationId: string;
  moduleId: string;
}

/** Seeded relationships. Extend this array to add new cross-module links. */
export const compatibilityMap: CompatRelation[] = [
  {
    id: 'carseat-stroller-fit',
    label: 'Car seat ↔ stroller fit',
    sourceModuleId: 'car-seat',
    targetModuleId: 'stroller',
    sourceNoun: 'seat',
    targetNoun: 'stroller',
    targets: [
      { label: 'Wayfinder', match: 'Wayfinder', fitAttribute: 'fitsWayfinder' },
      { label: 'Alterrain', match: 'Alterrain', fitAttribute: 'fitsAlterrain' },
    ],
  },
];

type TargetKind = 'owned' | 'considered' | 'none';

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Decide whether a target is owned, merely considered, or not in play. */
function classifyTarget(state: AppState, rel: CompatRelation, match: string): TargetKind {
  const re = new RegExp(escapeRegExp(match), 'i');

  // Owned: an inventory item you're keeping.
  if (state.inventory.some((i) => re.test(i.name) && i.status === 'keep')) return 'owned';

  // Considered: an option in the target module, or an undecided inventory item.
  const targetModule = state.modules.find((m) => m.id === rel.targetModuleId);
  if (targetModule?.options.some((o) => re.test(o.name))) return 'considered';
  if (state.inventory.some((i) => re.test(i.name) && i.status === 'undecided')) return 'considered';

  return 'none';
}

/**
 * Compute compatibility flags for the current state.
 * Evaluates each relation's source-module selected pick (defaults to top pick).
 */
export function computeCompatibilityFlags(state: AppState): CompatFlag[] {
  const flags: CompatFlag[] = [];

  for (const rel of compatibilityMap) {
    const source = state.modules.find((m) => m.id === rel.sourceModuleId);
    if (!source) continue;

    const pick = selectedOption(source);
    if (!pick) continue;

    const attrs = pick.attributes as Record<string, unknown>;
    const evaluated = rel.targets.map((t) => ({
      target: t,
      kind: classifyTarget(state, rel, t.match),
      fits: attrs[t.fitAttribute] === true,
    }));

    const inPlay = evaluated.filter((e) => e.kind !== 'none');
    if (inPlay.length === 0) continue; // nothing to check against

    // Targets the pick *does* fit — suggested as alternatives for any misfit.
    const fittedLabels = evaluated.filter((e) => e.fits).map((e) => e.target.label);

    let anyMisfit = false;
    for (const e of inPlay) {
      if (e.fits) continue;
      anyMisfit = true;
      const needs = fittedLabels.length ? ` — needs ${fittedLabels.join(' or ')}` : '';
      if (e.kind === 'owned') {
        flags.push({
          severity: 'red',
          relationId: rel.id,
          moduleId: source.id,
          message: `Selected ${rel.sourceNoun} doesn't fit your ${e.target.label}${needs}.`,
        });
      } else {
        flags.push({
          severity: 'yellow',
          relationId: rel.id,
          moduleId: source.id,
          message: `Selected ${rel.sourceNoun} won't fit the ${e.target.label} you're considering${needs}.`,
        });
      }
    }

    if (!anyMisfit) {
      flags.push({
        severity: 'green',
        relationId: rel.id,
        moduleId: source.id,
        message: `Selected ${rel.sourceNoun} (${pick.name}) fits every ${rel.targetNoun} you own or consider.`,
      });
    }
  }

  return flags;
}

// Saved views are the C1 layout's "tier-2" tabs: quick, named filters over the
// active module's options (All · Under budget · Fits my car · Top picks). They
// only ever *narrow which rows show* — ranking, scoring, and the value columns
// are untouched — so the comparison grid stays the single source of truth. Pure
// and unit-tested; the view UI just maps the result onto <ComparisonMatrix>.

import type { Module, Option } from './types';
import { bestPrice, percent, rankedOptions } from './scoring';
import { criterionMetric, metricFails, type MetricContext } from './criterionMetric';
import { criterionMatchesPriority } from './preferences';

export type ViewKey = 'all' | 'budget' | 'fit' | 'top';

export interface SavedView {
  key: ViewKey;
  label: string;
  /** How many options pass this view, for the tab's count badge. */
  count: number;
}

/** How many options "Top picks" keeps. */
export const TOP_N = 5;

/** The module's rear-facing-fit criterion, if it has one (drives "Fits my car"). */
const fitCriterion = (module: Module) => module.criteria.find((c) => criterionMatchesPriority(c, 'fit'));

/**
 * The options visible under one saved view, in source order (the grid re-ranks).
 * Unknown / inapplicable views fall back to every option.
 */
export function filterByView(module: Module, key: ViewKey, ctx: MetricContext): Option[] {
  switch (key) {
    case 'budget':
      return module.budget > 0 ? module.options.filter((o) => bestPrice(o) <= module.budget) : module.options;
    case 'fit': {
      const fc = fitCriterion(module);
      if (!fc || !ctx.backSeatLengthIn || ctx.backSeatLengthIn <= 0) return module.options;
      return module.options.filter((o) => {
        const m = criterionMetric(fc, o, ctx);
        return m ? !metricFails(m) : true; // keep options we can't measure
      });
    }
    case 'top':
      return rankedOptions(module).slice(0, TOP_N);
    case 'all':
    default:
      return module.options;
  }
}

/**
 * The views worth offering for this module: "All" always, "Under budget" when a
 * budget is set, "Fits my car" when the module has a fit criterion and the
 * visitor gave a back-seat length, and "Top {N}" once there are more than N
 * options. Each carries its live count.
 */
export function availableViews(module: Module, ctx: MetricContext): SavedView[] {
  const views: SavedView[] = [{ key: 'all', label: 'All', count: module.options.length }];

  if (module.budget > 0) {
    views.push({ key: 'budget', label: 'Under budget', count: filterByView(module, 'budget', ctx).length });
  }

  const fc = fitCriterion(module);
  if (fc && ctx.backSeatLengthIn && ctx.backSeatLengthIn > 0) {
    views.push({ key: 'fit', label: 'Fits my car', count: filterByView(module, 'fit', ctx).length });
  }

  if (module.options.length > TOP_N) {
    views.push({ key: 'top', label: `Top ${TOP_N}`, count: TOP_N });
  }

  return views;
}

/** Percent match for an option (re-exported convenience for the view UI). */
export const matchPercent = (option: Option, module: Module): number => percent(option, module.criteria);

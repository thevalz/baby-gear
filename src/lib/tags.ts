// Material / certification tags — the "non-toxic, plastic-free" facet some
// parents shop on specifically. Stored on each Option as lower-case kebab slugs
// (option.tags) and sourced like prices, with citations, by a research pass.
//
// This module is the single place that knows how to *display* a tag and how to
// filter the field by tags, so the UI never hard-codes a tag string.

import type { Module, Option } from './types';

export interface TagMeta {
  /** Human label shown on the chip, e.g. "Flame-retardant-free". */
  label: string;
  /** Short tooltip explaining what it means / why a shopper cares. */
  hint: string;
  /** Emoji prefix for the chip. */
  icon: string;
}

/**
 * Known tags. Unknown slugs still render (title-cased) so a sourcing pass can
 * add new tags without a code change, but the curated ones get a real label +
 * tooltip. Keep slugs kebab-case.
 */
export const TAG_META: Record<string, TagMeta> = {
  'flame-retardant-free': {
    label: 'Flame-retardant-free',
    hint: 'No added chemical flame retardants in the fabric/foam.',
    icon: '🌿',
  },
  'greenguard-gold': {
    label: 'GREENGUARD Gold',
    hint: 'Independently certified for low chemical emissions (UL GREENGUARD Gold).',
    icon: '🏅',
  },
  'non-toxic': {
    label: 'Non-toxic textiles',
    hint: 'Free of the most-scrutinized chemical classes (e.g. PFAS, added FRs).',
    icon: '✅',
  },
  'plastic-free': {
    label: 'Plastic-free',
    hint: 'Minimal or no plastic in the materials a child contacts.',
    icon: '♻️',
  },
  organic: {
    label: 'Organic fabric',
    hint: 'Made with certified-organic textiles.',
    icon: '🌱',
  },
  'merino-wool': {
    label: 'Merino wool',
    hint: 'Naturally flame-resistant merino instead of chemically-treated fabric.',
    icon: '🐑',
  },
};

const titleCase = (slug: string): string =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const tagLabel = (slug: string): string => TAG_META[slug]?.label ?? titleCase(slug);
export const tagHint = (slug: string): string | undefined => TAG_META[slug]?.hint;
export const tagIcon = (slug: string): string => TAG_META[slug]?.icon ?? '🏷️';

/** Every distinct tag present across a module's options, sorted for a stable bar. */
export function moduleTags(module: Module): string[] {
  const seen = new Set<string>();
  for (const o of module.options) for (const t of o.tags ?? []) seen.add(t);
  return [...seen].sort((a, b) => tagLabel(a).localeCompare(tagLabel(b)));
}

/** Does an option carry every one of the selected tags (AND semantics)? */
export function optionMatchesTags(option: Option, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const tags = new Set(option.tags ?? []);
  for (const t of selected) if (!tags.has(t)) return false;
  return true;
}

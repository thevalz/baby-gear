import { describe, expect, it } from 'vitest';
import type { Module, Option } from './types';
import { moduleTags, optionMatchesTags, tagIcon, tagLabel } from './tags';

const opt = (id: string, tags?: string[]): Option => ({
  id,
  moduleId: 'm',
  name: id,
  price: 0,
  attributes: {},
  scores: {},
  ...(tags ? { tags } : {}),
});

const mod = (opts: Option[]): Module => ({
  id: 'm',
  label: 'M',
  budget: 0,
  selectedOptionId: null,
  criteria: [],
  options: opts,
});

describe('tag display', () => {
  it('uses curated labels and falls back to title-case for unknown slugs', () => {
    expect(tagLabel('flame-retardant-free')).toBe('Flame-retardant-free');
    expect(tagLabel('some-new-thing')).toBe('Some New Thing');
    expect(tagIcon('greenguard-gold')).toBe('🏅');
    expect(tagIcon('some-new-thing')).toBe('🏷️');
  });
});

describe('moduleTags', () => {
  it('collects distinct tags across options, sorted by label', () => {
    const m = mod([
      opt('a', ['greenguard-gold', 'non-toxic']),
      opt('b', ['non-toxic']),
      opt('c'),
    ]);
    expect(moduleTags(m)).toEqual(['greenguard-gold', 'non-toxic'].sort((x, y) =>
      tagLabel(x).localeCompare(tagLabel(y)),
    ));
  });

  it('is empty when no option is tagged', () => {
    expect(moduleTags(mod([opt('a'), opt('b')]))).toEqual([]);
  });
});

describe('optionMatchesTags (AND semantics)', () => {
  const o = opt('a', ['non-toxic', 'greenguard-gold']);

  it('matches everything when nothing is selected', () => {
    expect(optionMatchesTags(o, new Set())).toBe(true);
    expect(optionMatchesTags(opt('b'), new Set())).toBe(true);
  });

  it('requires the option to carry every selected tag', () => {
    expect(optionMatchesTags(o, new Set(['non-toxic']))).toBe(true);
    expect(optionMatchesTags(o, new Set(['non-toxic', 'greenguard-gold']))).toBe(true);
    expect(optionMatchesTags(o, new Set(['non-toxic', 'plastic-free']))).toBe(false);
    expect(optionMatchesTags(opt('b'), new Set(['non-toxic']))).toBe(false);
  });
});

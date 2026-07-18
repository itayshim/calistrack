import { describe, expect, it } from 'vitest';
import {
  keywordSuggestions,
  normalizeTaxonomyValue,
  suggestedCategory,
  taxonomyIdentity,
  uniqueTaxonomyValues,
} from './taxonomy';

describe('exercise taxonomy normalization', () => {
  it('normalizes categories to lowercase kebab-case', () => {
    expect(normalizeTaxonomyValue(' Full__Body ', 'category')).toBe('full-body');
  });

  it('rejects normalized duplicates across case, spaces, underscores and hyphens', () => {
    expect(uniqueTaxonomyValues(['Full Body', 'full_body', 'full-body'], 'category')).toEqual([
      'full-body',
    ]);
  });

  it('uses canonical muscle aliases', () => {
    expect(uniqueTaxonomyValues(['lat', 'Lats', 'lats'], 'muscle')).toEqual(['lats']);
  });

  it('suggests pull for the Pull-Up and Chin-Up families', () => {
    expect(suggestedCategory('Pull-Up')).toBe('pull');
    expect(suggestedCategory('Chin-Up')).toBe('pull');
  });

  it('creates useful normalized keyword suggestions', () => {
    expect(keywordSuggestions('pull', 'Pull-Up')).toEqual(
      expect.arrayContaining(['pull', 'pull-up', 'vertical pull', 'calisthenics', 'bar']),
    );
  });

  it('uses the same identity for spelling separators', () => {
    expect(taxonomyIdentity('Pull Up', 'movement_family')).toBe(
      taxonomyIdentity('pull_up', 'movement_family'),
    );
  });
});

import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  titleSimilarity,
  isNearDuplicateTitle,
  NEAR_DUPLICATE_THRESHOLD,
} from './ideaDedup';

describe('ideaDedup — normalizeTitle', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeTitle('  Add   Caching-Layer!! ')).toBe('add caching layer');
  });

  it('treats different punctuation/casing of the same words as equal', () => {
    expect(normalizeTitle('Fix: the Bug (urgent)')).toBe(normalizeTitle('fix the bug urgent'));
  });
});

describe('ideaDedup — titleSimilarity', () => {
  it('is 1 for titles that normalize to the same significant tokens', () => {
    expect(titleSimilarity('Add a caching layer', 'Add caching layer')).toBe(1);
  });

  it('is low for unrelated titles', () => {
    expect(titleSimilarity('Add caching layer', 'Rewrite the auth flow')).toBeLessThan(0.3);
  });

  it('is symmetric', () => {
    const a = 'Improve error handling in the API';
    const b = 'Improve API error handling';
    expect(titleSimilarity(a, b)).toBeCloseTo(titleSimilarity(b, a));
  });
});

describe('ideaDedup — isNearDuplicateTitle', () => {
  const existing = ['Add a caching layer', 'Improve error handling', 'Rewrite auth flow'];

  it('flags an exact normalized match', () => {
    expect(isNearDuplicateTitle('add caching layer', existing)).toBe(true);
  });

  it('flags a high word-overlap near-duplicate', () => {
    expect(isNearDuplicateTitle('Add caching layer', existing)).toBe(true);
  });

  it('does not flag a genuinely new idea', () => {
    expect(isNearDuplicateTitle('Add rate limiting to uploads', existing)).toBe(false);
  });

  it('handles an empty candidate safely', () => {
    expect(isNearDuplicateTitle('   ', existing)).toBe(false);
  });

  it('respects a custom threshold', () => {
    // Partial overlap that clears a lenient threshold but not the default.
    const partial = 'Improve error messaging';
    expect(isNearDuplicateTitle(partial, ['Improve error handling'], 0.3)).toBe(true);
    expect(isNearDuplicateTitle(partial, ['Improve error handling'], NEAR_DUPLICATE_THRESHOLD)).toBe(false);
  });
});

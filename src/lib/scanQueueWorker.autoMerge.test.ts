import { describe, it, expect } from 'vitest';
import {
  isAutoMergeEligible,
  AUTO_MERGE_MIN_IMPACT,
  AUTO_MERGE_MAX_EFFORT,
} from './scanQueueWorker';

/**
 * Direction 1 — the auto-merge band must genuinely mean "high impact, low
 * effort" on the 1–10 scale, matching its user-facing label. The old predicate
 * `impact === 3 && effort === 1` was a stale 1–3-scale leftover that could
 * never match a real 1–10 score, so auto-merge was inert and mislabeled.
 */
describe('isAutoMergeEligible', () => {
  it('band constants encode the top-impact / bottom-effort tiers', () => {
    expect(AUTO_MERGE_MIN_IMPACT).toBe(8);
    expect(AUTO_MERGE_MAX_EFFORT).toBe(3);
  });

  it('accepts genuinely high-impact, low-effort ideas (a range, not equality)', () => {
    expect(isAutoMergeEligible({ impact: 8, effort: 1 })).toBe(true);
    expect(isAutoMergeEligible({ impact: 9, effort: 2 })).toBe(true);
    expect(isAutoMergeEligible({ impact: 10, effort: 3 })).toBe(true);
  });

  it('rejects high-effort or low-impact ideas', () => {
    expect(isAutoMergeEligible({ impact: 8, effort: 4 })).toBe(false);
    expect(isAutoMergeEligible({ impact: 7, effort: 1 })).toBe(false);
    expect(isAutoMergeEligible({ impact: 5, effort: 5 })).toBe(false);
  });

  it('rejects the stale 1–3-scale values that used to (mis)match', () => {
    expect(isAutoMergeEligible({ impact: 3, effort: 1 })).toBe(false);
  });

  it('rejects ideas missing a score', () => {
    expect(isAutoMergeEligible({ impact: null, effort: 1 })).toBe(false);
    expect(isAutoMergeEligible({ impact: 9, effort: null })).toBe(false);
    expect(isAutoMergeEligible({ impact: null, effort: null })).toBe(false);
  });
});

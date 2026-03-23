import { describe, it, expect } from 'vitest';
import {
  countIdeaStatuses,
  countDirectionStatuses,
  calculateAcceptanceRate,
  calculateFilteredAcceptanceRate,
  combineDistributions,
  calculateTrend,
  trendFromDelta,
} from '@/app/features/reflector/lib/ideaStatsAggregator';

describe('IdeaStatsAggregator', () => {
  // ── countIdeaStatuses ─────────────────────────────────────────────

  describe('countIdeaStatuses', () => {
    it('counts all four statuses correctly', () => {
      const items = [
        { status: 'pending' },
        { status: 'accepted' },
        { status: 'accepted' },
        { status: 'rejected' },
        { status: 'implemented' },
      ];
      const dist = countIdeaStatuses(items);
      expect(dist).toEqual({
        pending: 1, accepted: 2, rejected: 1, implemented: 1, total: 5,
      });
    });

    it('returns zeros for empty array', () => {
      expect(countIdeaStatuses([])).toEqual({
        pending: 0, accepted: 0, rejected: 0, implemented: 0, total: 0,
      });
    });
  });

  // ── countDirectionStatuses ────────────────────────────────────────

  describe('countDirectionStatuses', () => {
    it('never counts implemented', () => {
      const items = [
        { status: 'pending' },
        { status: 'accepted' },
        { status: 'rejected' },
        { status: 'implemented' }, // should be ignored
      ];
      const dist = countDirectionStatuses(items);
      expect(dist.implemented).toBe(0);
      expect(dist.total).toBe(4);
    });
  });

  // ── calculateAcceptanceRate ───────────────────────────────────────

  describe('calculateAcceptanceRate', () => {
    it('includes implemented in acceptance rate for ideas', () => {
      const dist = { pending: 2, accepted: 3, rejected: 1, implemented: 2, total: 8 };
      const { acceptanceRate, totalAccepted } = calculateAcceptanceRate(dist);
      // (3 + 2) / 8 = 62.5 → 63
      expect(totalAccepted).toBe(5);
      expect(acceptanceRate).toBe(63);
    });

    it('returns 0 for empty distribution', () => {
      const dist = { pending: 0, accepted: 0, rejected: 0, implemented: 0, total: 0 };
      expect(calculateAcceptanceRate(dist).acceptanceRate).toBe(0);
    });

    it('works for direction distributions (implemented=0)', () => {
      const dist = { pending: 1, accepted: 3, rejected: 1, implemented: 0, total: 5 };
      // 3 / 5 = 60
      expect(calculateAcceptanceRate(dist).acceptanceRate).toBe(60);
    });
  });

  // ── calculateFilteredAcceptanceRate ───────────────────────────────

  describe('calculateFilteredAcceptanceRate', () => {
    const ideas = { pending: 1, accepted: 2, rejected: 1, implemented: 1, total: 5 };
    const dirs = { pending: 1, accepted: 1, rejected: 1, implemented: 0, total: 3 };

    it('returns ideas-only rate for "ideas" filter', () => {
      const { acceptanceRate } = calculateFilteredAcceptanceRate(ideas, dirs, 'ideas');
      // (2 + 1) / 5 = 60
      expect(acceptanceRate).toBe(60);
    });

    it('returns directions-only rate for "directions" filter', () => {
      const { acceptanceRate } = calculateFilteredAcceptanceRate(ideas, dirs, 'directions');
      // 1 / 3 = 33
      expect(acceptanceRate).toBe(33);
    });

    it('returns combined rate for "both" filter', () => {
      const { acceptanceRate } = calculateFilteredAcceptanceRate(ideas, dirs, 'both');
      // (2 + 1 + 1) / 8 = 50
      expect(acceptanceRate).toBe(50);
    });
  });

  // ── combineDistributions ──────────────────────────────────────────

  describe('combineDistributions', () => {
    it('sums all fields', () => {
      const a = { pending: 1, accepted: 2, rejected: 3, implemented: 4, total: 10 };
      const b = { pending: 5, accepted: 6, rejected: 7, implemented: 0, total: 18 };
      expect(combineDistributions(a, b)).toEqual({
        pending: 6, accepted: 8, rejected: 10, implemented: 4, total: 28,
      });
    });
  });

  // ── calculateTrend ────────────────────────────────────────────────

  describe('calculateTrend', () => {
    it('returns up when current > previous', () => {
      const result = calculateTrend(15, 10);
      expect(result.trend).toBe('up');
      expect(result.changePercent).toBe(50);
    });

    it('returns down when current < previous', () => {
      const result = calculateTrend(5, 10);
      expect(result.trend).toBe('down');
      expect(result.changePercent).toBe(-50);
    });

    it('returns stable when equal', () => {
      expect(calculateTrend(10, 10).trend).toBe('stable');
    });

    it('returns 100% when previous is 0 and current > 0', () => {
      const result = calculateTrend(5, 0);
      expect(result.changePercent).toBe(100);
      expect(result.trend).toBe('up');
    });

    it('returns 0% when both are 0', () => {
      expect(calculateTrend(0, 0).changePercent).toBe(0);
    });
  });

  // ── trendFromDelta ────────────────────────────────────────────────

  describe('trendFromDelta', () => {
    it('returns stable within threshold', () => {
      expect(trendFromDelta(3)).toBe('stable');
      expect(trendFromDelta(-4)).toBe('stable');
      expect(trendFromDelta(5)).toBe('stable'); // exactly at threshold
    });

    it('returns up above threshold', () => {
      expect(trendFromDelta(6)).toBe('up');
    });

    it('returns down below negative threshold', () => {
      expect(trendFromDelta(-6)).toBe('down');
    });

    it('respects custom threshold', () => {
      expect(trendFromDelta(3, 2)).toBe('up');
    });
  });
});

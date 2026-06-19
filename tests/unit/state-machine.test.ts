/**
 * Tests for the shared status state machine (direction + goal transitions).
 *
 * These invariants are load-bearing for the 2026-06-19 fixes:
 *  - manager #1 (claim-before-accept) relies on pending->accepted being INVALID and
 *    pending->processing / processing->accepted being valid.
 *  - manager #2 (atomic paired-accept) relies on 'rejected' being terminal, so the
 *    second concurrent accept throws on rejected->accepted.
 */

import { describe, it, expect } from 'vitest';
import {
  directionTransition,
  goalTransition,
  InvalidTransitionError,
  isValidDirectionStatus,
} from '@/lib/stateMachine';

describe('directionTransition', () => {
  it('allows the claim/accept happy path', () => {
    expect(() => directionTransition('pending', 'processing')).not.toThrow();
    expect(() => directionTransition('processing', 'accepted')).not.toThrow();
    expect(() => directionTransition('processing', 'rejected')).not.toThrow();
    expect(() => directionTransition('pending', 'rejected')).not.toThrow();
  });

  it('rejects pending -> accepted (must claim to processing first)', () => {
    expect(() => directionTransition('pending', 'accepted')).toThrow(InvalidTransitionError);
  });

  it('treats accepted and rejected as terminal', () => {
    for (const to of ['processing', 'accepted', 'pending'] as const) {
      expect(() => directionTransition('rejected', to)).toThrow(InvalidTransitionError);
    }
    for (const to of ['processing', 'rejected', 'pending'] as const) {
      expect(() => directionTransition('accepted', to)).toThrow(InvalidTransitionError);
    }
  });

  it('allows same-status no-op transitions', () => {
    expect(() => directionTransition('accepted', 'accepted')).not.toThrow();
    expect(() => directionTransition('pending', 'pending')).not.toThrow();
  });

  it('throws an InvalidTransitionError naming from/to/entity', () => {
    try {
      directionTransition('rejected', 'accepted');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidTransitionError);
      expect((e as Error).message).toContain('rejected');
      expect((e as Error).message).toContain('accepted');
      expect((e as Error).message).toContain('direction');
    }
  });
});

describe('goalTransition', () => {
  it('allows the open -> in_progress -> done lifecycle', () => {
    expect(() => goalTransition('open', 'in_progress')).not.toThrow();
    expect(() => goalTransition('in_progress', 'done')).not.toThrow();
  });

  it('treats done and rejected as terminal', () => {
    expect(() => goalTransition('done', 'open')).toThrow(InvalidTransitionError);
    expect(() => goalTransition('rejected', 'in_progress')).toThrow(InvalidTransitionError);
  });

  it('allows reopening in_progress -> open', () => {
    expect(() => goalTransition('in_progress', 'open')).not.toThrow();
  });
});

describe('isValidDirectionStatus', () => {
  it('accepts only the four known statuses', () => {
    for (const s of ['pending', 'processing', 'accepted', 'rejected']) {
      expect(isValidDirectionStatus(s)).toBe(true);
    }
    expect(isValidDirectionStatus('done')).toBe(false);
    expect(isValidDirectionStatus('')).toBe(false);
  });
});

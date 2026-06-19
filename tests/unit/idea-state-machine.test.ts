/**
 * Tests for IdeaStateMachine.authorize — the gate every idea status change funnels through.
 *
 * Load-bearing for the 2026-06-19 fixes:
 *  - ideas #1 (atomic accept CAS): pending->accepted is allowed with NO side-effects, and
 *    accepted->accepted is an allowed no-op — which is exactly why the CAS (not the state
 *    machine) has to prevent a double-accept.
 *  - ideas #2 (partial-safe bulk approve): implemented->accepted / implemented->rejected
 *    are INVALID and throw, so a batch with an already-implemented idea must be tolerated.
 */

import { describe, it, expect } from 'vitest';
import { IdeaStateMachine } from '@/lib/ideas/ideaStateMachine';

describe('IdeaStateMachine.authorize', () => {
  it('allows pending -> accepted with no side-effects', () => {
    const r = IdeaStateMachine.authorize('pending', 'accepted');
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.sideEffects).toEqual({});
  });

  it('treats accepted -> accepted as an allowed no-op (why ideas #1 needs a CAS)', () => {
    const r = IdeaStateMachine.authorize('accepted', 'accepted');
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.sideEffects).toEqual({});
  });

  it('clears requirement_id when rejecting', () => {
    const fromPending = IdeaStateMachine.authorize('pending', 'rejected');
    expect(fromPending.allowed).toBe(true);
    if (fromPending.allowed) expect(fromPending.sideEffects).toEqual({ requirement_id: null });

    const fromAccepted = IdeaStateMachine.authorize('accepted', 'rejected');
    if (fromAccepted.allowed) expect(fromAccepted.sideEffects).toEqual({ requirement_id: null });
  });

  it('stamps implemented_at on accepted -> implemented', () => {
    const r = IdeaStateMachine.authorize('accepted', 'implemented');
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(typeof r.sideEffects.implemented_at).toBe('string');
  });

  it('rejects implemented -> accepted and implemented -> rejected (implemented is terminal)', () => {
    expect(IdeaStateMachine.authorize('implemented', 'accepted').allowed).toBe(false);
    expect(IdeaStateMachine.authorize('implemented', 'rejected').allowed).toBe(false);
  });

  it('allows the documented re-open paths', () => {
    expect(IdeaStateMachine.authorize('rejected', 'pending').allowed).toBe(true);
    expect(IdeaStateMachine.authorize('accepted', 'pending').allowed).toBe(true);
  });

  it('denied transitions carry a reason', () => {
    const r = IdeaStateMachine.authorize('implemented', 'accepted');
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(typeof r.reason).toBe('string');
  });
});

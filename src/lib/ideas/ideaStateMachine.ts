/**
 * IdeaStateMachine — declarative transition rules for idea statuses.
 *
 * All status changes funnel through `authorize()` which validates that the
 * transition is allowed and returns any side-effect field updates (e.g.
 * `implemented_at`). This eliminates scattered validation and makes it
 * impossible to perform invalid transitions.
 *
 * Usage:
 *   const result = IdeaStateMachine.authorize(idea.status, 'accepted');
 *   if (!result.allowed) throw new Error(result.reason);
 *   ideaDb.updateIdea(id, { status: 'accepted', ...result.sideEffects });
 */

import type { DbIdea } from '@/app/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The four DB-level statuses that ideas can hold. */
export type IdeaStatus = DbIdea['status'];

/** Side-effect fields applied automatically on certain transitions. */
export type TransitionSideEffects = {
  implemented_at?: string;
  requirement_id?: null;
};

export interface TransitionAllowed {
  allowed: true;
  from: IdeaStatus;
  to: IdeaStatus;
  sideEffects: TransitionSideEffects;
}

export interface TransitionDenied {
  allowed: false;
  from: IdeaStatus;
  to: IdeaStatus;
  reason: string;
}

export type TransitionResult = TransitionAllowed | TransitionDenied;

// ---------------------------------------------------------------------------
// Transition table
// ---------------------------------------------------------------------------

/**
 * Declarative map of `from → Set<to>` for every legal transition.
 *
 * Rules:
 *   pending    → accepted, rejected
 *   accepted   → implemented, rejected, pending (rollback)
 *   rejected   → pending (re-open)
 *   implemented → (terminal — no outbound transitions)
 */
const TRANSITIONS: Record<IdeaStatus, ReadonlySet<IdeaStatus>> = {
  pending:     new Set(['accepted', 'rejected']),
  accepted:    new Set(['implemented', 'rejected', 'pending']),
  rejected:    new Set(['pending']),
  implemented: new Set([]),
};

// ---------------------------------------------------------------------------
// Side-effect hooks
// ---------------------------------------------------------------------------

type SideEffectHook = () => TransitionSideEffects;

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Side-effects keyed by `from:to` transition string.
 * Only transitions with side-effects need entries here.
 */
const SIDE_EFFECTS: Record<string, SideEffectHook> = {
  'accepted:implemented': () => ({ implemented_at: getCurrentTimestamp() }),
  'pending:rejected':     () => ({ requirement_id: null }),
  'accepted:rejected':    () => ({ requirement_id: null }),
};

function getSideEffects(from: IdeaStatus, to: IdeaStatus): TransitionSideEffects {
  const hook = SIDE_EFFECTS[`${from}:${to}`];
  return hook ? hook() : {};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const IdeaStateMachine = {
  /**
   * Check whether a transition is allowed and compute side-effects.
   */
  authorize(from: IdeaStatus, to: IdeaStatus): TransitionResult {
    // No-op transition (same state) is always allowed with no side-effects
    if (from === to) {
      return { allowed: true, from, to, sideEffects: {} };
    }

    const allowed = TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
      return {
        allowed: false,
        from,
        to,
        reason: `Invalid transition: ${from} → ${to}`,
      };
    }

    return {
      allowed: true,
      from,
      to,
      sideEffects: getSideEffects(from, to),
    };
  },

  /**
   * Returns the set of statuses reachable from the given status.
   */
  allowedTransitions(from: IdeaStatus): readonly IdeaStatus[] {
    return [...(TRANSITIONS[from] ?? [])];
  },

  /**
   * All valid idea statuses.
   */
  statuses: ['pending', 'accepted', 'rejected', 'implemented'] as const satisfies readonly IdeaStatus[],

  /**
   * Type guard for validating a string is a valid IdeaStatus.
   */
  isValidStatus(status: string): status is IdeaStatus {
    return (IdeaStateMachine.statuses as readonly string[]).includes(status);
  },
} as const;

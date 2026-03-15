/**
 * Status State Machines
 *
 * Explicit lifecycle state machines for Question, Direction, and Goal entities.
 * Each machine declares valid transitions and a transition() function that
 * throws InvalidTransitionError on illegal moves.
 *
 * Usage:
 *   import { questionTransition, isValidDirectionStatus } from '@/lib/stateMachine';
 *
 *   // Validate a transition (throws on illegal move)
 *   questionTransition('pending', 'answered');
 *
 *   // Validate a status query param
 *   if (!isValidDirectionStatus(param)) return 400;
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionStatus = 'pending' | 'answered';

export type DirectionStatus = 'pending' | 'processing' | 'accepted' | 'rejected';

export type GoalStatus = 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';

// ─────────────────────────────────────────────────────────────────────────────
// Transition Tables
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_TRANSITIONS: Record<QuestionStatus, QuestionStatus[]> = {
  pending: ['answered'],
  answered: [],
};

const DIRECTION_TRANSITIONS: Record<DirectionStatus, DirectionStatus[]> = {
  pending: ['processing', 'rejected'],
  processing: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

const GOAL_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  open: ['in_progress', 'rejected', 'undecided'],
  in_progress: ['done', 'rejected', 'open'],
  done: [],
  rejected: [],
  undecided: ['open', 'in_progress'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string, entity: string) {
    super(`Invalid ${entity} status transition: '${from}' → '${to}'`);
    this.name = 'InvalidTransitionError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

function makeTransitionFn<S extends string>(
  transitions: Record<S, S[]>,
  entityName: string,
): (from: S, to: S) => void {
  const map = new Map<S, ReadonlySet<S>>();
  for (const [from, tos] of Object.entries(transitions) as [S, S[]][]) {
    map.set(from, new Set(tos));
  }
  return (from: S, to: S): void => {
    if (from === to) return; // no-op transitions are always allowed
    const allowed = map.get(from);
    if (!allowed || !allowed.has(to)) {
      throw new InvalidTransitionError(from, to, entityName);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Valid Status Sets (for query param validation)
// ─────────────────────────────────────────────────────────────────────────────

export const VALID_QUESTION_STATUSES = new Set<QuestionStatus>(['pending', 'answered']);
export const VALID_DIRECTION_STATUSES = new Set<DirectionStatus>(['pending', 'processing', 'accepted', 'rejected']);
export const VALID_GOAL_STATUSES = new Set<GoalStatus>(['open', 'in_progress', 'done', 'rejected', 'undecided']);

export function isValidQuestionStatus(s: string): s is QuestionStatus {
  return VALID_QUESTION_STATUSES.has(s as QuestionStatus);
}

export function isValidDirectionStatus(s: string): s is DirectionStatus {
  return VALID_DIRECTION_STATUSES.has(s as DirectionStatus);
}

export function isValidGoalStatus(s: string): s is GoalStatus {
  return VALID_GOAL_STATUSES.has(s as GoalStatus);
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition Functions (throw on illegal move)
// ─────────────────────────────────────────────────────────────────────────────

/** Validate a Question status transition. Throws InvalidTransitionError on illegal moves. */
export const questionTransition = makeTransitionFn(QUESTION_TRANSITIONS, 'question');

/** Validate a Direction status transition. Throws InvalidTransitionError on illegal moves. */
export const directionTransition = makeTransitionFn(DIRECTION_TRANSITIONS, 'direction');

/** Validate a Goal status transition. Throws InvalidTransitionError on illegal moves. */
export const goalTransition = makeTransitionFn(GOAL_TRANSITIONS, 'goal');

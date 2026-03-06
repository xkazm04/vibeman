/**
 * Status Algebra
 *
 * Unified status type system for lifecycle states across the codebase.
 * Domain-specific types are narrowed from the universal set via Extract<>.
 *
 * Usage:
 *   import { BaseLifecycleStatus, Status, isTerminal } from '@/lib/status';
 *
 *   // Type-safe narrowing — compiler prevents invalid assignments
 *   const s: BaseLifecycleStatus = Status.COMPLETED;
 *
 *   // Guards for control flow
 *   if (isTerminal(s)) { ... }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Universal Status Type
// ─────────────────────────────────────────────────────────────────────────────

/** Union of all shared lifecycle status values across the codebase. */
export type UniversalStatus =
  | 'idle'
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'aborted'
  | 'skipped';

// ─────────────────────────────────────────────────────────────────────────────
// Domain-Narrowed Types
// ─────────────────────────────────────────────────────────────────────────────

/** Core 4-state lifecycle: pending → running → completed | failed */
export type BaseLifecycleStatus = Extract<
  UniversalStatus,
  'pending' | 'running' | 'completed' | 'failed'
>;

/** Session lifecycle with pause support */
export type SessionLifecycleStatus = Extract<
  UniversalStatus,
  'pending' | 'running' | 'paused' | 'completed' | 'failed'
>;

/** Step lifecycle with skip support */
export type StepLifecycleStatus = Extract<
  UniversalStatus,
  'pending' | 'running' | 'completed' | 'failed' | 'skipped'
>;

/** Execution lifecycle with cancellation and timeout */
export type ExecutableLifecycleStatus = Extract<
  UniversalStatus,
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
>;

/** Queue-based lifecycle using queued instead of pending */
export type QueueLifecycleStatus = Extract<
  UniversalStatus,
  'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
>;

// ─────────────────────────────────────────────────────────────────────────────
// Status Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Type-safe status constants. Use instead of magic strings. */
export const Status = {
  IDLE: 'idle',
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  ABORTED: 'aborted',
  SKIPPED: 'skipped',
} as const satisfies Record<string, UniversalStatus>;

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL: ReadonlySet<string> = new Set([
  'completed', 'failed', 'cancelled', 'timeout', 'aborted', 'skipped',
]);

const ACTIVE: ReadonlySet<string> = new Set(['running', 'paused']);

const ERROR: ReadonlySet<string> = new Set(['failed', 'timeout', 'aborted']);

/** True when the status represents a terminal (no further transitions) state. */
export function isTerminal(status: string): boolean {
  return TERMINAL.has(status);
}

/** True when the status represents an active (in-progress) state. */
export function isActive(status: string): boolean {
  return ACTIVE.has(status);
}

/** True when the status represents a successful terminal state. */
export function isSuccess(status: string): boolean {
  return status === 'completed';
}

/** True when the status represents an error terminal state. */
export function isError(status: string): boolean {
  return ERROR.has(status);
}

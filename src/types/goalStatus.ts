/**
 * Single source of truth for Goal status values.
 *
 * Import from here instead of defining inline string unions.
 * The const array is useful for runtime validation (e.g., Zod schemas,
 * SQL CHECK constraints) while the derived type provides compile-time safety.
 */

export const GOAL_STATUSES = ['open', 'in_progress', 'done', 'rejected', 'undecided'] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

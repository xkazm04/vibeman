/**
 * Kanban column transition rules and execution.
 * Defines which status transitions are allowed via drag-and-drop,
 * and executes the appropriate store actions.
 */

import type { KanbanColumnId, TaskStatusUnion } from './types';
import { createQueuedStatus, createCompletedStatus } from './types';

// ============================================================================
// Transition Rules
// ============================================================================

const ALLOWED_TRANSITIONS: Record<KanbanColumnId, KanbanColumnId[]> = {
  'backlog': ['in-progress'],
  'in-progress': ['backlog', 'done'],
  'done': ['backlog'],
  'failed': ['backlog'],
};

/**
 * Check if a card transition is allowed.
 * Running tasks cannot be moved to backlog (would require aborting execution).
 */
export function isTransitionAllowed(
  fromColumn: KanbanColumnId,
  toColumn: KanbanColumnId,
  statusType: TaskStatusUnion['type'],
): boolean {
  if (fromColumn === toColumn) return false;

  const allowed = ALLOWED_TRANSITIONS[fromColumn];
  if (!allowed?.includes(toColumn)) return false;

  // Running tasks can only move forward (to done), not backward
  if (statusType === 'running' && toColumn === 'backlog') return false;

  return true;
}

/**
 * Execute a kanban column transition by calling the appropriate handlers.
 */
export function executeTransition(
  reqId: string,
  toColumn: KanbanColumnId,
  handlers: {
    resetTask: (reqId: string) => void;
    updateStatus: (reqId: string, status: TaskStatusUnion) => void;
  },
): void {
  switch (toColumn) {
    case 'backlog':
      handlers.resetTask(reqId);
      break;
    case 'in-progress':
      handlers.updateStatus(reqId, createQueuedStatus());
      break;
    case 'done':
      handlers.updateStatus(reqId, createCompletedStatus());
      break;
    case 'failed':
      // Not typically user-initiated, but handle gracefully
      break;
  }
}

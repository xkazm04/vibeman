/**
 * Selection Types for Ideas Module
 *
 * Defines types for context and group selection in the Ideas feature.
 * Supports both individual context selection and whole-group selection.
 */

/**
 * Selection state for the Ideas module
 * Tracks both individual context selections and whole-group selections
 */
export interface SelectionState {
  /** Individual context IDs selected for filtering/generation */
  contextIds: string[];
  /** Context group IDs selected as whole units for generation */
  groupIds: string[];
}

/**
 * Selection mode based on current selection state
 */
export type SelectionMode = 'contexts' | 'groups' | 'mixed' | 'none';

/**
 * Get the current selection mode based on selection state
 */
export function getSelectionMode(state: SelectionState): SelectionMode {
  const hasContexts = state.contextIds.length > 0;
  const hasGroups = state.groupIds.length > 0;

  if (!hasContexts && !hasGroups) return 'none';
  if (hasGroups && !hasContexts) return 'groups';
  if (hasContexts && !hasGroups) return 'contexts';
  return 'mixed';
}

/**
 * Check if a selection is empty (no contexts or groups selected)
 */
export function isSelectionEmpty(state: SelectionState): boolean {
  return state.contextIds.length === 0 && state.groupIds.length === 0;
}

/**
 * Get total selection count
 */
export function getSelectionCount(state: SelectionState): number {
  return state.contextIds.length + state.groupIds.length;
}

/**
 * Create an empty selection state
 */
export function createEmptySelection(): SelectionState {
  return {
    contextIds: [],
    groupIds: [],
  };
}

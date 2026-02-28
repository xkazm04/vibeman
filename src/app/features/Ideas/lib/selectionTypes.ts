/**
 * Selection Types for Ideas Module
 *
 * Context-only selection model. Clicking a group is UI sugar for
 * multi-selecting its child contexts — no separate group selection state.
 */

/**
 * Selection state for the Ideas module
 * Flat list of individual context IDs
 */
export interface SelectionState {
  /** Individual context IDs selected for filtering/generation */
  contextIds: string[];
}

/**
 * Check if a selection is empty
 */
export function isSelectionEmpty(state: SelectionState): boolean {
  return state.contextIds.length === 0;
}

/**
 * Get total selection count
 */
export function getSelectionCount(state: SelectionState): number {
  return state.contextIds.length;
}

/**
 * Create an empty selection state
 */
export function createEmptySelection(): SelectionState {
  return { contextIds: [] };
}

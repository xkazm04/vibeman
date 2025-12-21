/**
 * Normalized State Types for FeedbackItem
 *
 * This module provides normalized data structures for O(1) lookups
 * and efficient status-based grouping without O(n) iterations.
 */

import type { FeedbackItem, KanbanStatus } from '../types/feedbackTypes';

/**
 * Normalized state structure using a Map for O(1) item lookups
 * and pre-computed status indices for efficient grouped views
 */
export interface NormalizedFeedbackState {
  /** Map for O(1) item lookup by ID */
  byId: Map<string, FeedbackItem>;
  /** All item IDs in insertion order */
  allIds: string[];
  /** Pre-computed status index: status -> Set of item IDs */
  byStatus: Record<KanbanStatus, Set<string>>;
}

/**
 * Creates an empty normalized feedback state
 */
export function createEmptyNormalizedState(): NormalizedFeedbackState {
  return {
    byId: new Map(),
    allIds: [],
    byStatus: {
      new: new Set(),
      analyzed: new Set(),
      manual: new Set(),
      automatic: new Set(),
      done: new Set(),
    },
  };
}

/**
 * Creates a normalized state from an array of feedback items
 */
export function normalizeItems(items: FeedbackItem[]): NormalizedFeedbackState {
  const state = createEmptyNormalizedState();

  for (const item of items) {
    state.byId.set(item.id, item);
    state.allIds.push(item.id);
    state.byStatus[item.status].add(item.id);
  }

  return state;
}

/**
 * Adds multiple items to the normalized state
 * Returns a new state object (immutable update)
 */
export function addItems(
  state: NormalizedFeedbackState,
  items: FeedbackItem[]
): NormalizedFeedbackState {
  const newById = new Map(state.byId);
  const newAllIds = [...state.allIds];
  const newByStatus: Record<KanbanStatus, Set<string>> = {
    new: new Set(state.byStatus.new),
    analyzed: new Set(state.byStatus.analyzed),
    manual: new Set(state.byStatus.manual),
    automatic: new Set(state.byStatus.automatic),
    done: new Set(state.byStatus.done),
  };

  for (const item of items) {
    if (!newById.has(item.id)) {
      newById.set(item.id, item);
      newAllIds.push(item.id);
    } else {
      newById.set(item.id, item);
    }
    newByStatus[item.status].add(item.id);
  }

  return {
    byId: newById,
    allIds: newAllIds,
    byStatus: newByStatus,
  };
}

/**
 * Updates a single item in the normalized state
 * Handles status changes by updating the status index
 */
export function updateItem(
  state: NormalizedFeedbackState,
  itemId: string,
  updater: (item: FeedbackItem) => FeedbackItem
): NormalizedFeedbackState {
  const existingItem = state.byId.get(itemId);
  if (!existingItem) return state;

  const updatedItem = updater(existingItem);

  if (updatedItem === existingItem) return state;

  const newById = new Map(state.byId);
  newById.set(itemId, updatedItem);

  if (existingItem.status !== updatedItem.status) {
    const newByStatus: Record<KanbanStatus, Set<string>> = {
      new: new Set(state.byStatus.new),
      analyzed: new Set(state.byStatus.analyzed),
      manual: new Set(state.byStatus.manual),
      automatic: new Set(state.byStatus.automatic),
      done: new Set(state.byStatus.done),
    };

    newByStatus[existingItem.status].delete(itemId);
    newByStatus[updatedItem.status].add(itemId);

    return {
      byId: newById,
      allIds: state.allIds,
      byStatus: newByStatus,
    };
  }

  return {
    ...state,
    byId: newById,
  };
}

/**
 * Updates multiple items in the normalized state
 */
export function updateItems(
  state: NormalizedFeedbackState,
  itemIds: string[],
  updater: (item: FeedbackItem) => FeedbackItem
): NormalizedFeedbackState {
  const newById = new Map(state.byId);
  const newByStatus: Record<KanbanStatus, Set<string>> = {
    new: new Set(state.byStatus.new),
    analyzed: new Set(state.byStatus.analyzed),
    manual: new Set(state.byStatus.manual),
    automatic: new Set(state.byStatus.automatic),
    done: new Set(state.byStatus.done),
  };

  let statusChanged = false;

  for (const itemId of itemIds) {
    const existingItem = state.byId.get(itemId);
    if (!existingItem) continue;

    const updatedItem = updater(existingItem);
    newById.set(itemId, updatedItem);

    if (existingItem.status !== updatedItem.status) {
      statusChanged = true;
      newByStatus[existingItem.status].delete(itemId);
      newByStatus[updatedItem.status].add(itemId);
    }
  }

  return {
    byId: newById,
    allIds: state.allIds,
    byStatus: statusChanged ? newByStatus : state.byStatus,
  };
}

/**
 * Removes an item from the normalized state
 */
export function removeItem(
  state: NormalizedFeedbackState,
  itemId: string
): NormalizedFeedbackState {
  const existingItem = state.byId.get(itemId);
  if (!existingItem) return state;

  const newById = new Map(state.byId);
  newById.delete(itemId);

  const newByStatus: Record<KanbanStatus, Set<string>> = {
    new: new Set(state.byStatus.new),
    analyzed: new Set(state.byStatus.analyzed),
    manual: new Set(state.byStatus.manual),
    automatic: new Set(state.byStatus.automatic),
    done: new Set(state.byStatus.done),
  };
  newByStatus[existingItem.status].delete(itemId);

  return {
    byId: newById,
    allIds: state.allIds.filter((id) => id !== itemId),
    byStatus: newByStatus,
  };
}

/**
 * Clears all items from the state
 */
export function clearState(): NormalizedFeedbackState {
  return createEmptyNormalizedState();
}

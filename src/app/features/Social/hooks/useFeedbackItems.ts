'use client';

/**
 * useFeedbackItems Hook
 * Provides normalized state management for feedback items with O(1) lookups.
 */

import { useState, useCallback, useMemo } from 'react';
import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';
import {
  NormalizedFeedbackState,
  normalizeItems,
  addItems,
  updateItem,
  updateItems,
  removeItem,
  clearState,
  createEmptyNormalizedState,
} from '../lib/utils/normalizedState';

export interface UseFeedbackItemsOptions {
  initialItems?: FeedbackItem[];
}

export interface UseFeedbackItemsReturn {
  state: NormalizedFeedbackState;
  getItem: (id: string) => FeedbackItem | undefined;
  getAllItems: () => FeedbackItem[];
  getItemsByStatus: (status: KanbanStatus) => FeedbackItem[];
  getItemsGroupedByStatus: () => Record<KanbanStatus, FeedbackItem[]>;
  getCountByStatus: (status: KanbanStatus) => number;
  getTotalCount: () => number;
  hasItem: (id: string) => boolean;
  setItems: (items: FeedbackItem[]) => void;
  addItems: (items: FeedbackItem[]) => void;
  updateItem: (id: string, updater: (item: FeedbackItem) => FeedbackItem) => void;
  updateItems: (ids: string[], updater: (item: FeedbackItem) => FeedbackItem) => void;
  updateItemStatus: (id: string, status: KanbanStatus) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export function useFeedbackItems(
  options: UseFeedbackItemsOptions = {}
): UseFeedbackItemsReturn {
  const { initialItems = [] } = options;

  const [state, setState] = useState<NormalizedFeedbackState>(() =>
    initialItems.length > 0 ? normalizeItems(initialItems) : createEmptyNormalizedState()
  );

  const getItemFn = useCallback(
    (id: string): FeedbackItem | undefined => {
      return state.byId.get(id);
    },
    [state.byId]
  );

  const getAllItems = useCallback((): FeedbackItem[] => {
    return state.allIds.map((id) => state.byId.get(id)!);
  }, [state.allIds, state.byId]);

  const getItemsByStatus = useCallback(
    (status: KanbanStatus): FeedbackItem[] => {
      const ids = state.byStatus[status];
      const items: FeedbackItem[] = [];
      ids.forEach((id) => {
        const item = state.byId.get(id);
        if (item) items.push(item);
      });
      return items;
    },
    [state.byId, state.byStatus]
  );

  const itemsGroupedByStatus = useMemo((): Record<KanbanStatus, FeedbackItem[]> => {
    const result: Record<KanbanStatus, FeedbackItem[]> = {
      new: [],
      analyzed: [],
      manual: [],
      automatic: [],
      done: [],
    };

    for (const status of Object.keys(result) as KanbanStatus[]) {
      const ids = state.byStatus[status];
      ids.forEach((id) => {
        const item = state.byId.get(id);
        if (item) result[status].push(item);
      });
    }

    return result;
  }, [state.byId, state.byStatus]);

  const getItemsGroupedByStatus = useCallback(
    () => itemsGroupedByStatus,
    [itemsGroupedByStatus]
  );

  const getCountByStatus = useCallback(
    (status: KanbanStatus): number => {
      return state.byStatus[status].size;
    },
    [state.byStatus]
  );

  const getTotalCount = useCallback((): number => {
    return state.allIds.length;
  }, [state.allIds.length]);

  const hasItemFn = useCallback(
    (id: string): boolean => {
      return state.byId.has(id);
    },
    [state.byId]
  );

  const setItemsAction = useCallback((items: FeedbackItem[]) => {
    setState(normalizeItems(items));
  }, []);

  const addItemsAction = useCallback((items: FeedbackItem[]) => {
    setState((prev) => addItems(prev, items));
  }, []);

  const updateItemAction = useCallback(
    (id: string, updater: (item: FeedbackItem) => FeedbackItem) => {
      setState((prev) => updateItem(prev, id, updater));
    },
    []
  );

  const updateItemsAction = useCallback(
    (ids: string[], updater: (item: FeedbackItem) => FeedbackItem) => {
      setState((prev) => updateItems(prev, ids, updater));
    },
    []
  );

  const updateItemStatusAction = useCallback((id: string, status: KanbanStatus) => {
    setState((prev) =>
      updateItem(prev, id, (item) => ({ ...item, status }))
    );
  }, []);

  const removeItemAction = useCallback((id: string) => {
    setState((prev) => removeItem(prev, id));
  }, []);

  const clearAction = useCallback(() => {
    setState(clearState());
  }, []);

  return {
    state,
    getItem: getItemFn,
    getAllItems,
    getItemsByStatus,
    getItemsGroupedByStatus,
    getCountByStatus,
    getTotalCount,
    hasItem: hasItemFn,
    setItems: setItemsAction,
    addItems: addItemsAction,
    updateItem: updateItemAction,
    updateItems: updateItemsAction,
    updateItemStatus: updateItemStatusAction,
    removeItem: removeItemAction,
    clear: clearAction,
  };
}

export type UseFeedbackItemsResult = UseFeedbackItemsReturn;

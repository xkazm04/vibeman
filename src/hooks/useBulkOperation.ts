'use client';

import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Represents a single item that can be operated on in bulk
 */
export interface BulkItem<T = unknown> {
  /** Unique identifier for the item */
  id: string;
  /** The actual data */
  data: T;
}

/**
 * Snapshot of state before a bulk operation (for undo)
 */
export interface BulkOperationSnapshot<T = unknown> {
  /** Unique ID for this snapshot */
  id: string;
  /** Description of the operation */
  description: string;
  /** Items affected by the operation */
  affectedItems: BulkItem<T>[];
  /** Timestamp when the operation was performed */
  timestamp: number;
  /** Function to undo the operation */
  undo: () => void | Promise<void>;
}

/**
 * Configuration for a bulk operation
 */
export interface BulkOperationConfig<T = unknown> {
  /** Human-readable name of the operation */
  name: string;
  /** Description shown in confirmation dialog */
  description?: string;
  /** Whether to require confirmation (default: true for > 1 item) */
  requireConfirmation?: boolean;
  /** Threshold for requiring confirmation (default: 1) */
  confirmationThreshold?: number;
  /** Whether the operation is reversible (default: true) */
  reversible?: boolean;
  /** Maximum undo history size (default: 10) */
  maxUndoHistory?: number;
  /** The action to perform on each item */
  action: (items: BulkItem<T>[]) => void | Promise<void>;
  /** Function to create undo action (receives the items before operation) */
  createUndo?: (itemsBefore: BulkItem<T>[]) => () => void | Promise<void>;
}

/**
 * State of the bulk operation manager
 */
export interface BulkOperationState<T = unknown> {
  /** Whether an operation is currently in progress */
  isProcessing: boolean;
  /** Items pending confirmation */
  pendingItems: BulkItem<T>[] | null;
  /** Pending operation config */
  pendingConfig: BulkOperationConfig<T> | null;
  /** Undo history stack */
  undoHistory: BulkOperationSnapshot<T>[];
  /** Error from last operation */
  error: string | null;
  /** Last successful operation description */
  lastOperation: string | null;
}

/**
 * Return value of useBulkOperation hook
 */
export interface BulkOperationManager<T = unknown> {
  /** Current state */
  state: BulkOperationState<T>;
  /** Execute a bulk operation (may trigger confirmation) */
  execute: (items: BulkItem<T>[], config: BulkOperationConfig<T>) => Promise<boolean>;
  /** Confirm a pending operation */
  confirm: () => Promise<boolean>;
  /** Cancel a pending operation */
  cancel: () => void;
  /** Undo the last reversible operation */
  undo: () => Promise<boolean>;
  /** Clear the undo history */
  clearHistory: () => void;
  /** Check if undo is available */
  canUndo: boolean;
  /** Number of items that would be affected */
  pendingCount: number;
}

/**
 * Hook to manage bulk operations with confirmation and undo support
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const bulk = useBulkOperation<FileNode>();
 *
 *   const handleSelectAllInFolder = async (folder: FolderNode) => {
 *     const files = getAllFilesInFolder(folder);
 *     await bulk.execute(
 *       files.map(f => ({ id: f.id, data: f })),
 *       {
 *         name: 'Select All',
 *         action: (items) => selectFiles(items.map(i => i.id)),
 *         createUndo: (items) => () => deselectFiles(items.map(i => i.id)),
 *       }
 *     );
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => handleSelectAllInFolder(folder)}>
 *         Select All in Folder
 *       </button>
 *       {bulk.canUndo && (
 *         <button onClick={() => bulk.undo()}>
 *           Undo ({bulk.state.undoHistory[0]?.description})
 *         </button>
 *       )}
 *       {bulk.state.pendingItems && (
 *         <ConfirmDialog
 *           message={`${bulk.state.pendingConfig?.name} ${bulk.pendingCount} items?`}
 *           onConfirm={bulk.confirm}
 *           onCancel={bulk.cancel}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useBulkOperation<T = unknown>(): BulkOperationManager<T> {
  const [state, setState] = useState<BulkOperationState<T>>({
    isProcessing: false,
    pendingItems: null,
    pendingConfig: null,
    undoHistory: [],
    error: null,
    lastOperation: null,
  });

  // Use ref to store pending state to avoid stale closure in confirm
  const pendingRef = useRef<{
    items: BulkItem<T>[];
    config: BulkOperationConfig<T>;
  } | null>(null);

  const executeInternal = useCallback(
    async (items: BulkItem<T>[], config: BulkOperationConfig<T>): Promise<boolean> => {
      if (items.length === 0) return true;

      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        // Create snapshot for undo if reversible
        let snapshot: BulkOperationSnapshot<T> | null = null;
        if (config.reversible !== false && config.createUndo) {
          const undoFn = config.createUndo(items);
          snapshot = {
            id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            description: `${config.name} (${items.length} items)`,
            affectedItems: [...items],
            timestamp: Date.now(),
            undo: undoFn,
          };
        }

        // Execute the action
        await config.action(items);

        // Update state with success
        setState((prev) => {
          const newHistory = snapshot
            ? [snapshot, ...prev.undoHistory].slice(0, config.maxUndoHistory ?? 10)
            : prev.undoHistory;

          return {
            ...prev,
            isProcessing: false,
            pendingItems: null,
            pendingConfig: null,
            undoHistory: newHistory,
            lastOperation: `${config.name} (${items.length} items)`,
          };
        });

        pendingRef.current = null;
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: err instanceof Error ? err.message : 'Operation failed',
        }));
        return false;
      }
    },
    []
  );

  const execute = useCallback(
    async (items: BulkItem<T>[], config: BulkOperationConfig<T>): Promise<boolean> => {
      if (items.length === 0) return true;

      const threshold = config.confirmationThreshold ?? 1;
      const needsConfirmation =
        config.requireConfirmation !== false && items.length > threshold;

      if (needsConfirmation) {
        // Store pending operation for confirmation
        pendingRef.current = { items, config };
        setState((prev) => ({
          ...prev,
          pendingItems: items,
          pendingConfig: config,
          error: null,
        }));
        return false; // Operation pending confirmation
      }

      // Execute immediately
      return executeInternal(items, config);
    },
    [executeInternal]
  );

  const confirm = useCallback(async (): Promise<boolean> => {
    const pending = pendingRef.current;
    if (!pending) return false;

    return executeInternal(pending.items, pending.config);
  }, [executeInternal]);

  const cancel = useCallback(() => {
    pendingRef.current = null;
    setState((prev) => ({
      ...prev,
      pendingItems: null,
      pendingConfig: null,
    }));
  }, []);

  const undo = useCallback(async (): Promise<boolean> => {
    const [lastSnapshot, ...rest] = state.undoHistory;
    if (!lastSnapshot) return false;

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      await lastSnapshot.undo();

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        undoHistory: rest,
        lastOperation: `Undo: ${lastSnapshot.description}`,
      }));

      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: err instanceof Error ? err.message : 'Undo failed',
      }));
      return false;
    }
  }, [state.undoHistory]);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, undoHistory: [] }));
  }, []);

  const canUndo = state.undoHistory.length > 0;
  const pendingCount = state.pendingItems?.length ?? 0;

  return useMemo(
    () => ({
      state,
      execute,
      confirm,
      cancel,
      undo,
      clearHistory,
      canUndo,
      pendingCount,
    }),
    [state, execute, confirm, cancel, undo, clearHistory, canUndo, pendingCount]
  );
}

// ============================================================================
// UTILITY FUNCTIONS FOR COMMON BULK OPERATIONS
// ============================================================================

/**
 * Create a bulk selection config
 */
export function createBulkSelectConfig<T>(
  selectFn: (ids: string[]) => void,
  deselectFn: (ids: string[]) => void
): BulkOperationConfig<T> {
  return {
    name: 'Select All',
    confirmationThreshold: 50, // Only confirm for large selections
    action: (items) => selectFn(items.map((i) => i.id)),
    createUndo: (items) => () => deselectFn(items.map((i) => i.id)),
  };
}

/**
 * Create a bulk delete config
 */
export function createBulkDeleteConfig<T>(
  deleteFn: (items: BulkItem<T>[]) => void | Promise<void>,
  restoreFn?: (items: BulkItem<T>[]) => void | Promise<void>
): BulkOperationConfig<T> {
  return {
    name: 'Delete All',
    description: 'This action will delete the selected items.',
    requireConfirmation: true,
    confirmationThreshold: 0, // Always confirm deletes
    reversible: !!restoreFn,
    action: deleteFn,
    createUndo: restoreFn ? (items) => () => restoreFn(items) : undefined,
  };
}

/**
 * Create a bulk status update config
 */
export function createBulkStatusConfig<T>(
  statusName: string,
  updateFn: (ids: string[], status: string) => void | Promise<void>,
  previousStatuses?: Map<string, string>
): BulkOperationConfig<T> {
  return {
    name: `Mark as ${statusName}`,
    confirmationThreshold: 10,
    action: (items) => updateFn(items.map((i) => i.id), statusName),
    createUndo: previousStatuses
      ? (items) => () => {
          // Restore previous statuses
          items.forEach((item) => {
            const prevStatus = previousStatuses.get(item.id);
            if (prevStatus) {
              updateFn([item.id], prevStatus);
            }
          });
        }
      : undefined,
  };
}

export default useBulkOperation;

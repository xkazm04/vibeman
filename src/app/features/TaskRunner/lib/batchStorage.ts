/**
 * LocalStorage recovery system for batch runner
 * Persists batch state to survive page reloads
 */

export interface BatchState {
  id: string;
  name: string;
  requirementIds: string[];
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentIndex: number;
  startedAt: number | null;
  completedCount: number;
}

export type BatchId = 'batch1' | 'batch2' | 'batch3' | 'batch4';

export interface MultiBatchState {
  batch1: BatchState | null;
  batch2: BatchState | null;
  batch3: BatchState | null;
  batch4: BatchState | null;
  activeBatch: BatchId | null;
}

const STORAGE_KEY = 'taskRunner_batchState';

/**
 * Helper: Safe localStorage operation with error handling
 */
function safeLocalStorageOp<T>(operation: () => T, fallback: T): T {
  try {
    return operation();
  } catch (error) {
    return fallback;
  }
}

export class BatchStorage {
  /**
   * Save batch state to localStorage
   */
  static save(state: MultiBatchState): void {
    safeLocalStorageOp(() => {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    }, undefined);
  }

  /**
   * Load batch state from localStorage
   */
  static load(): MultiBatchState | null {
    return safeLocalStorageOp(() => {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return null;
      return JSON.parse(serialized) as MultiBatchState;
    }, null);
  }

  /**
   * Clear batch state from localStorage
   */
  static clear(): void {
    safeLocalStorageOp(() => {
      localStorage.removeItem(STORAGE_KEY);
    }, undefined);
  }

  /**
   * Update a specific batch
   */
  static updateBatch(batchId: BatchId, updates: Partial<BatchState>): void {
    const current = this.load();
    if (!current) return;

    const batch = current[batchId];
    if (!batch) return;

    const updatedBatch = { ...batch, ...updates };
    const newState = {
      ...current,
      [batchId]: updatedBatch,
    };

    this.save(newState);
  }

  /**
   * Create initial batch state
   */
  static createBatch(
    id: string,
    name: string,
    requirementIds: string[]
  ): BatchState {
    return {
      id,
      name,
      requirementIds,
      status: 'idle',
      currentIndex: 0,
      startedAt: null,
      completedCount: 0,
    };
  }
}

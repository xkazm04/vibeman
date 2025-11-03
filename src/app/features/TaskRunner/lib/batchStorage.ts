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

export class BatchStorage {
  /**
   * Save batch state to localStorage
   */
  static save(state: MultiBatchState): void {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      // Silently fail - state will not persist
    }
  }

  /**
   * Load batch state from localStorage
   */
  static load(): MultiBatchState | null {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return null;

      const state = JSON.parse(serialized) as MultiBatchState;
      return state;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear batch state from localStorage
   */
  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Silently fail
    }
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

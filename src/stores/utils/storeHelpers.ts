/**
 * Store Helper Utilities
 *
 * Shared utility functions for reducing duplication across Zustand stores
 */

/**
 * Generic error handler for store operations
 * Returns a standardized error message
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Create a loading state setter with error handling
 * Reduces duplication in async operations
 */
export interface AsyncOperationState {
  loading: boolean;
  error: string | null;
}

export function createLoadingState(): AsyncOperationState {
  return {
    loading: true,
    error: null
  };
}

export function createErrorState(error: unknown, fallback: string): AsyncOperationState {
  return {
    loading: false,
    error: getErrorMessage(error, fallback)
  };
}

export function createSuccessState(): AsyncOperationState {
  return {
    loading: false,
    error: null
  };
}

/**
 * Generic state updater for array operations
 */
export function updateArrayItem<T extends { id: string }>(
  array: T[],
  id: string,
  updates: Partial<T> | T
): T[] {
  return array.map(item => item.id === id ? { ...item, ...updates } as T : item);
}

export function removeArrayItem<T extends { id: string }>(
  array: T[],
  id: string
): T[] {
  return array.filter(item => item.id !== id);
}

export function addArrayItem<T>(
  array: T[],
  item: T,
  position: 'start' | 'end' = 'start'
): T[] {
  return position === 'start' ? [item, ...array] : [...array, item];
}

/**
 * Debounced Loading State Manager
 *
 * Prevents rapid loading state flickers by:
 * 1. Only showing loading after a delay (default 150ms)
 * 2. Batching rapid operations so loading shows once
 * 3. Clearing loading state when all operations complete
 *
 * Usage:
 *   const loadingManager = createDebouncedLoadingManager(set, 150);
 *
 *   // In async operation:
 *   loadingManager.startOperation();
 *   try {
 *     await doWork();
 *     loadingManager.endOperation();
 *   } catch (error) {
 *     loadingManager.endOperation();
 *     throw error;
 *   }
 */
export interface DebouncedLoadingManager {
  startOperation: () => void;
  endOperation: () => void;
  forceLoading: () => void;
  reset: () => void;
}

export function createDebouncedLoadingManager(
  setLoading: (loading: boolean) => void,
  delayMs: number = 150
): DebouncedLoadingManager {
  let pendingOperations = 0;
  let loadingTimer: ReturnType<typeof setTimeout> | null = null;
  let isLoadingShown = false;

  const clearTimer = () => {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
  };

  const showLoading = () => {
    if (!isLoadingShown) {
      isLoadingShown = true;
      setLoading(true);
    }
  };

  const hideLoading = () => {
    if (isLoadingShown) {
      isLoadingShown = false;
      setLoading(false);
    }
  };

  return {
    startOperation: () => {
      pendingOperations++;

      // Only start timer if this is the first pending operation
      if (pendingOperations === 1 && !loadingTimer && !isLoadingShown) {
        loadingTimer = setTimeout(() => {
          loadingTimer = null;
          // Only show loading if operations are still pending
          if (pendingOperations > 0) {
            showLoading();
          }
        }, delayMs);
      }
    },

    endOperation: () => {
      pendingOperations = Math.max(0, pendingOperations - 1);

      // When all operations complete, clear loading state
      if (pendingOperations === 0) {
        clearTimer();
        hideLoading();
      }
    },

    forceLoading: () => {
      clearTimer();
      showLoading();
    },

    reset: () => {
      pendingOperations = 0;
      clearTimer();
      hideLoading();
    }
  };
}

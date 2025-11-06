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

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

/**
 * Stall Detector - Zero-Progress Heuristic
 *
 * Detects stuck operations by checking if an operation is running
 * but producing no progress. Useful for:
 * - Async task monitoring (tasks that launched but hang)
 * - Streaming operations that stop mid-stream
 * - Progress-based operations with potential deadlocks
 *
 * Pattern extracted from TaskMonitor component.
 *
 * Usage:
 *   const detector = createStallDetector<MyTask>({
 *     isRunning: (task) => task.status === 'running',
 *     getProgressCount: (task) => task.output.length,
 *     onStallDetected: (task) => console.warn('Task stalled:', task.id),
 *     stallThresholdMs: 30000, // optional: time-based threshold
 *   });
 *
 *   // Check single item
 *   const isStuck = detector.isStalled(task);
 *
 *   // Check collection and get stuck items
 *   const stuckTasks = detector.findStalled(tasks);
 *
 *   // Monitor continuously
 *   detector.startMonitoring(getTasks, 5000);
 *   detector.stopMonitoring();
 */
export interface StallDetectorConfig<T> {
  /** Returns true if the item is in a "running" state */
  isRunning: (item: T) => boolean;
  /** Returns the progress count (0 = no progress) */
  getProgressCount: (item: T) => number;
  /** Optional callback when stall is detected */
  onStallDetected?: (item: T) => void;
  /** Optional: consider stalled only if running longer than this (ms) */
  stallThresholdMs?: number;
  /** Optional: get start time for threshold check */
  getStartTime?: (item: T) => Date | string | number | undefined;
}

export interface StallDetector<T> {
  /** Check if a single item is stalled */
  isStalled: (item: T) => boolean;
  /** Find all stalled items in a collection */
  findStalled: (items: T[]) => T[];
  /** Count stalled items */
  countStalled: (items: T[]) => number;
  /** Start continuous monitoring */
  startMonitoring: (getItems: () => T[] | Promise<T[]>, intervalMs?: number) => void;
  /** Stop continuous monitoring */
  stopMonitoring: () => void;
}

export function createStallDetector<T>(
  config: StallDetectorConfig<T>
): StallDetector<T> {
  const { isRunning, getProgressCount, onStallDetected, stallThresholdMs, getStartTime } = config;
  let monitorInterval: ReturnType<typeof setInterval> | null = null;
  const notifiedItems = new WeakSet<object>();

  const checkTimeThreshold = (item: T): boolean => {
    if (!stallThresholdMs || !getStartTime) return true;
    const startTime = getStartTime(item);
    if (!startTime) return true;
    const start = typeof startTime === 'string' || typeof startTime === 'number'
      ? new Date(startTime)
      : startTime;
    const elapsed = Date.now() - start.getTime();
    return elapsed >= stallThresholdMs;
  };

  const isStalled = (item: T): boolean => {
    return isRunning(item) && getProgressCount(item) === 0 && checkTimeThreshold(item);
  };

  const findStalled = (items: T[]): T[] => {
    return items.filter(isStalled);
  };

  const countStalled = (items: T[]): number => {
    return items.reduce((count, item) => count + (isStalled(item) ? 1 : 0), 0);
  };

  const notifyStalled = (items: T[]) => {
    if (!onStallDetected) return;
    for (const item of items) {
      // Only notify once per item (for object types)
      if (typeof item === 'object' && item !== null) {
        if (!notifiedItems.has(item)) {
          notifiedItems.add(item);
          onStallDetected(item);
        }
      } else {
        onStallDetected(item);
      }
    }
  };

  return {
    isStalled,
    findStalled,
    countStalled,

    startMonitoring: (getItems, intervalMs = 5000) => {
      if (monitorInterval) {
        clearInterval(monitorInterval);
      }

      const check = async () => {
        const items = await getItems();
        const stalled = findStalled(items);
        notifyStalled(stalled);
      };

      check(); // Immediate first check
      monitorInterval = setInterval(check, intervalMs);
    },

    stopMonitoring: () => {
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
    }
  };
}

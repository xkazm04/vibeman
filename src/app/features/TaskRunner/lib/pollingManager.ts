/**
 * Polling Manager
 *
 * A dedicated utility module for managing interval-based polling operations.
 * Encapsulates all interval tracking, cleanup, and recovery logic to prevent
 * memory leaks and simplify polling management across the TaskRunner system.
 *
 * Key Features:
 * - Type-safe polling state management
 * - Automatic cleanup on task completion
 * - Recovery support for page refresh scenarios
 * - Configurable polling intervals and max attempts
 * - Error handling with retry logic
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for a polling operation
 */
export interface PollingConfig {
  /** Polling interval in milliseconds (default: 10000ms / 10s) */
  intervalMs?: number;
  /** Maximum number of polling attempts before timeout (default: 120) */
  maxAttempts?: number;
  /** Callback invoked on each polling attempt with attempt count */
  onAttempt?: (attempt: number) => void;
}

/**
 * State of an active polling operation
 */
export interface PollingState {
  /** Unique identifier for this polling operation */
  taskId: string;
  /** The interval timer reference */
  intervalRef: NodeJS.Timeout;
  /** Current attempt count */
  attempts: number;
  /** Maximum attempts before timeout */
  maxAttempts: number;
  /** Timestamp when polling started */
  startedAt: number;
  /** Polling interval in milliseconds */
  intervalMs: number;
  /** Whether the async callback is currently executing */
  isRunning: boolean;
}

/**
 * Result from a polling callback
 */
export interface PollingResult {
  /** Whether to stop polling */
  done: boolean;
  /** Whether the task completed successfully (only relevant if done=true) */
  success?: boolean;
  /** Error message if the task failed */
  error?: string;
}

/**
 * Callback function invoked on each polling interval
 * @returns Promise with polling result indicating whether to continue
 */
export type PollingCallback = () => Promise<PollingResult>;

/**
 * Error scenarios that can occur during polling
 */
export type PollingError =
  | { type: 'timeout'; taskId: string; attempts: number }
  | { type: 'callback_error'; taskId: string; error: Error }
  | { type: 'already_polling'; taskId: string };

// ============================================================================
// Module State
// ============================================================================

/** Track active polling intervals by task ID */
const activePollingIntervals = new Map<string, PollingState>();

/** Default polling configuration */
const DEFAULT_CONFIG: Required<PollingConfig> = {
  intervalMs: 10000, // 10 seconds
  maxAttempts: Infinity, // No timeout - sessions can take a long time
  onAttempt: () => {},
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Start polling for a task
 *
 * @param taskId - Unique identifier for the polling operation
 * @param callback - Async function called on each interval that returns polling result
 * @param config - Optional polling configuration
 * @throws If polling is already active for this task ID
 *
 * @example
 * ```typescript
 * startPolling('task-123', async () => {
 *   const status = await getTaskStatus('task-123');
 *   if (status === 'completed') {
 *     return { done: true, success: true };
 *   }
 *   if (status === 'failed') {
 *     return { done: true, success: false, error: 'Task failed' };
 *   }
 *   return { done: false }; // Continue polling
 * }, { intervalMs: 5000, maxAttempts: 60 });
 * ```
 */
export function startPolling(
  taskId: string,
  callback: PollingCallback,
  config: PollingConfig = {}
): void {
  // Merge with defaults
  const fullConfig: Required<PollingConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Stop any existing polling for this task
  if (activePollingIntervals.has(taskId)) {
    console.log(`⚠️ Polling already active for task ${taskId}, stopping existing polling`);
    stopPolling(taskId);
  }

  console.log(`🔄 Starting polling for task: ${taskId} (interval: ${fullConfig.intervalMs}ms, max: ${fullConfig.maxAttempts})`);

  let attempts = 0;
  const startedAt = Date.now();

  const intervalRef = setInterval(async () => {
    // Skip this tick if the previous callback is still executing
    const currentState = activePollingIntervals.get(taskId);
    if (currentState?.isRunning) {
      return;
    }

    attempts++;
    fullConfig.onAttempt(attempts);

    // Check for timeout (only if maxAttempts is finite)
    if (Number.isFinite(fullConfig.maxAttempts) && attempts >= fullConfig.maxAttempts) {
      console.error(`⏰ Polling timeout for task: ${taskId} after ${attempts} attempts`);
      stopPolling(taskId);
      return;
    }

    // Set the running flag before executing the callback
    if (currentState) {
      currentState.isRunning = true;
    }

    try {
      const result = await callback();

      if (result.done) {
        if (result.success) {
          console.log(`✅ Polling completed successfully for task: ${taskId}`);
        } else {
          console.log(`❌ Polling ended with failure for task: ${taskId}${result.error ? ': ' + result.error : ''}`);
        }
        stopPolling(taskId);
      }
    } catch (error) {
      console.error(`Error in polling callback for task ${taskId}:`, error);
      // Continue polling despite error - will retry on next interval
    } finally {
      // Clear the running flag so the next tick can execute
      const stateAfter = activePollingIntervals.get(taskId);
      if (stateAfter) {
        stateAfter.isRunning = false;
      }
    }
  }, fullConfig.intervalMs);

  // Store the polling state
  const state: PollingState = {
    taskId,
    intervalRef,
    attempts: 0,
    maxAttempts: fullConfig.maxAttempts,
    startedAt,
    intervalMs: fullConfig.intervalMs,
    isRunning: false,
  };
  activePollingIntervals.set(taskId, state);
}

/**
 * Stop polling for a specific task
 *
 * @param taskId - The task ID to stop polling for
 * @returns true if polling was active and stopped, false if no polling was active
 *
 * @example
 * ```typescript
 * const wasStopped = stopPolling('task-123');
 * if (wasStopped) {
 *   console.log('Polling was active and has been stopped');
 * }
 * ```
 */
export function stopPolling(taskId: string): boolean {
  const state = activePollingIntervals.get(taskId);

  if (!state) {
    return false;
  }

  clearInterval(state.intervalRef);
  activePollingIntervals.delete(taskId);

  const duration = Date.now() - state.startedAt;
  console.log(`⏹️ Stopped polling for task: ${taskId} (duration: ${Math.round(duration / 1000)}s, attempts: ${state.attempts})`);

  return true;
}

/**
 * Stop all active polling operations
 *
 * Use this when cleaning up the entire system (e.g., user clears all batches)
 *
 * @returns Number of polling operations that were stopped
 *
 * @example
 * ```typescript
 * const count = cleanupAllPolling();
 * console.log(`Stopped ${count} active polling operations`);
 * ```
 */
export function cleanupAllPolling(): number {
  const count = activePollingIntervals.size;

  if (count === 0) {
    return 0;
  }

  console.log(`🧹 Cleaning up ${count} active polling operations`);

  activePollingIntervals.forEach((state, taskId) => {
    clearInterval(state.intervalRef);
    console.log(`  ⏹️ Stopped: ${taskId}`);
  });

  activePollingIntervals.clear();

  return count;
}

/**
 * Recover and restart polling for previously active tasks
 *
 * Use this after page refresh to reconnect to running tasks.
 * Provide a list of task IDs that should be polling along with their callbacks.
 *
 * @param tasks - Array of tasks to recover polling for
 * @returns Number of polling operations that were recovered
 *
 * @example
 * ```typescript
 * const recoveredCount = recoverActivePolling([
 *   {
 *     taskId: 'task-123',
 *     callback: async () => {
 *       const status = await getTaskStatus('task-123');
 *       return { done: status !== 'running' };
 *     },
 *   },
 * ]);
 * ```
 */
export function recoverActivePolling(
  tasks: Array<{
    taskId: string;
    callback: PollingCallback;
    config?: PollingConfig;
  }>
): number {
  let recoveredCount = 0;

  console.log(`🔌 Attempting to recover polling for ${tasks.length} tasks`);

  for (const { taskId, callback, config } of tasks) {
    // Skip if already polling
    if (activePollingIntervals.has(taskId)) {
      console.log(`  ⏭️ Skipping ${taskId}: already polling`);
      continue;
    }

    startPolling(taskId, callback, config);
    recoveredCount++;
    console.log(`  🔄 Recovered: ${taskId}`);
  }

  return recoveredCount;
}

/**
 * Check if polling is active for a specific task
 *
 * @param taskId - The task ID to check
 * @returns true if polling is active, false otherwise
 */
export function isPollingActive(taskId: string): boolean {
  return activePollingIntervals.has(taskId);
}

/**
 * Get the current state of a polling operation
 *
 * @param taskId - The task ID to get state for
 * @returns The polling state or undefined if not active
 */
export function getPollingState(taskId: string): Readonly<Omit<PollingState, 'intervalRef'>> | undefined {
  const state = activePollingIntervals.get(taskId);

  if (!state) {
    return undefined;
  }

  // Return a copy without the interval ref (internal implementation detail)
  return {
    taskId: state.taskId,
    attempts: state.attempts,
    maxAttempts: state.maxAttempts,
    startedAt: state.startedAt,
    intervalMs: state.intervalMs,
    isRunning: state.isRunning,
  };
}

/**
 * Get all currently active polling task IDs
 *
 * @returns Array of task IDs with active polling
 */
export function getActivePollingTaskIds(): string[] {
  return Array.from(activePollingIntervals.keys());
}

/**
 * Get count of active polling operations
 *
 * @returns Number of active polling operations
 */
export function getActivePollingCount(): number {
  return activePollingIntervals.size;
}

/**
 * Update the attempt count for a polling operation (used internally)
 * This is called automatically when polling interval fires
 */
export function updatePollingAttempts(taskId: string, attempts: number): void {
  const state = activePollingIntervals.get(taskId);
  if (state) {
    state.attempts = attempts;
  }
}

/**
 * Polling Manager
 *
 * A task-keyed registry of polling operations built on the unified poller.
 * Manages concurrent polling for multiple TaskRunner tasks with recovery support.
 *
 * This module is a thin wrapper around createUnifiedPoller from @/hooks/usePolling.
 * It adds:
 * - A Map to track multiple concurrent polling operations by taskId
 * - Recovery support for page refresh scenarios
 * - Bulk cleanup operations
 */

import {
  createUnifiedPoller,
  type UnifiedPoller,
  type PollingResult,
  type PollingCallback,
  PollingResults,
  type PollingResultContinue,
  type PollingResultSuccess,
  type PollingResultFailure,
} from '@/hooks/usePolling';

// Re-export types for consumers
export type { PollingResult, PollingCallback, PollingResultContinue, PollingResultSuccess, PollingResultFailure };
export { PollingResults };

// ============================================================================
// Types
// ============================================================================

export interface PollingConfig {
  /** Polling interval in milliseconds (default: 10000ms / 10s) */
  intervalMs?: number;
  /** Maximum number of polling attempts before timeout (default: Infinity) */
  maxAttempts?: number;
  /** Callback invoked on each polling attempt with attempt count */
  onAttempt?: (attempt: number) => void;
}

export interface PollingState {
  taskId: string;
  attempts: number;
  maxAttempts: number;
  startedAt: number;
  intervalMs: number;
  isRunning: boolean;
}

export type PollingError =
  | { type: 'timeout'; taskId: string; attempts: number }
  | { type: 'callback_error'; taskId: string; error: Error }
  | { type: 'already_polling'; taskId: string };

// ============================================================================
// Module State
// ============================================================================

interface PollingEntry {
  poller: UnifiedPoller;
  startedAt: number;
  intervalMs: number;
  maxAttempts: number;
}

const activePollingIntervals = new Map<string, PollingEntry>();

const DEFAULT_CONFIG = {
  intervalMs: 10000,
  maxAttempts: Infinity,
  onAttempt: () => {},
};

// ============================================================================
// Public API
// ============================================================================

export function startPolling(
  taskId: string,
  callback: PollingCallback,
  config: PollingConfig = {}
): void {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Stop any existing polling for this task
  if (activePollingIntervals.has(taskId)) {
    console.log(`\u26a0\ufe0f Polling already active for task ${taskId}, stopping existing polling`);
    stopPolling(taskId);
  }

  console.log(`\ud83d\udd04 Starting polling for task: ${taskId} (interval: ${fullConfig.intervalMs}ms, max: ${fullConfig.maxAttempts})`);

  const startedAt = Date.now();

  const poller = createUnifiedPoller(callback, {
    activeIntervalMs: fullConfig.intervalMs,
    immediate: false,
    maxAttempts: fullConfig.maxAttempts,
    onAttempt: fullConfig.onAttempt,
    onTimeout: () => {
      const state = poller.getState();
      console.error(`\u23f0 Polling timeout for task: ${taskId} after ${state.attempts} attempts`);
      activePollingIntervals.delete(taskId);
    },
  });

  activePollingIntervals.set(taskId, {
    poller,
    startedAt,
    intervalMs: fullConfig.intervalMs,
    maxAttempts: fullConfig.maxAttempts,
  });

  poller.start();
}

export function stopPolling(taskId: string): boolean {
  const entry = activePollingIntervals.get(taskId);
  if (!entry) return false;

  const state = entry.poller.getState();
  entry.poller.stop();
  activePollingIntervals.delete(taskId);

  const duration = Date.now() - entry.startedAt;
  console.log(`\u23f9\ufe0f Stopped polling for task: ${taskId} (duration: ${Math.round(duration / 1000)}s, attempts: ${state.attempts})`);

  return true;
}

export function cleanupAllPolling(): number {
  const count = activePollingIntervals.size;
  if (count === 0) return 0;

  console.log(`\ud83e\uddf9 Cleaning up ${count} active polling operations`);

  activePollingIntervals.forEach((entry, taskId) => {
    entry.poller.stop();
    console.log(`  \u23f9\ufe0f Stopped: ${taskId}`);
  });

  activePollingIntervals.clear();
  return count;
}

export function recoverActivePolling(
  tasks: Array<{
    taskId: string;
    callback: PollingCallback;
    config?: PollingConfig;
  }>
): number {
  let recoveredCount = 0;

  console.log(`\ud83d\udd0c Attempting to recover polling for ${tasks.length} tasks`);

  for (const { taskId, callback, config } of tasks) {
    if (activePollingIntervals.has(taskId)) {
      console.log(`  \u23ed\ufe0f Skipping ${taskId}: already polling`);
      continue;
    }

    startPolling(taskId, callback, config);
    recoveredCount++;
    console.log(`  \ud83d\udd04 Recovered: ${taskId}`);
  }

  return recoveredCount;
}

export function isPollingActive(taskId: string): boolean {
  return activePollingIntervals.has(taskId);
}

export function getPollingState(taskId: string): Readonly<PollingState> | undefined {
  const entry = activePollingIntervals.get(taskId);
  if (!entry) return undefined;

  const state = entry.poller.getState();
  return {
    taskId,
    attempts: state.attempts,
    maxAttempts: entry.maxAttempts,
    startedAt: entry.startedAt,
    intervalMs: entry.intervalMs,
    isRunning: state.isRunning,
  };
}

export function getActivePollingTaskIds(): string[] {
  return Array.from(activePollingIntervals.keys());
}

export function getActivePollingCount(): number {
  return activePollingIntervals.size;
}

export function updatePollingAttempts(_taskId: string, _attempts: number): void {
  // Attempts are now tracked internally by the unified poller.
  // This function is kept for backwards compatibility but is a no-op.
}

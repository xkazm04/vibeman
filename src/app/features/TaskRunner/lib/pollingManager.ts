/**
 * Polling Manager
 *
 * A task-keyed registry of polling operations built on the unified poller.
 * Manages concurrent polling for multiple TaskRunner tasks with recovery support.
 *
 * Supports two modes:
 * 1. SSE-first (default): Connects to SSE stream for instant push notifications,
 *    falls back to 30s polling if SSE disconnects.
 * 2. Polling-only: Classic 10s interval polling (used as fallback).
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
  eventSource?: EventSource;
  mode: 'sse' | 'polling';
}

const activePollingIntervals = new Map<string, PollingEntry>();

const DEFAULT_CONFIG = {
  intervalMs: 10000,
  maxAttempts: Infinity,
  onAttempt: () => {},
};

/** Fallback polling interval when SSE disconnects (30s instead of 10s) */
const SSE_FALLBACK_INTERVAL_MS = 30_000;

// ============================================================================
// SSE Support
// ============================================================================

/**
 * Start SSE-first polling for a task.
 * Connects to the SSE stream endpoint; on each event, invokes the callback.
 * If SSE fails to connect or disconnects, falls back to 30s polling.
 *
 * @param pollingTaskId - The task key used for polling registry (typically requirementId)
 * @param sseTaskId - The actual task ID used for the SSE endpoint URL
 * @param callback - The polling callback to invoke on each event
 * @param config - Optional polling configuration
 */
export function startSSEPolling(
  pollingTaskId: string,
  sseTaskId: string,
  callback: PollingCallback,
  config: PollingConfig = {}
): void {
  // Stop any existing polling for this task
  if (activePollingIntervals.has(pollingTaskId)) {
    console.log(`[SSE] Already polling for ${pollingTaskId}, restarting...`);
    stopPolling(pollingTaskId);
  }

  const startedAt = Date.now();

  // Try SSE first
  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource(`/api/claude-code/tasks/${encodeURIComponent(sseTaskId)}/stream`);
      let callbackRunning = false;
      let stopped = false;

      // Create a minimal poller as backup (30s) - starts paused
      const fallbackPoller = createUnifiedPoller(callback, {
        activeIntervalMs: SSE_FALLBACK_INTERVAL_MS,
        immediate: false,
        maxAttempts: config.maxAttempts ?? Infinity,
        onAttempt: config.onAttempt,
        onTimeout: () => {
          console.error(`[SSE] Fallback polling timeout for task: ${pollingTaskId}`);
          activePollingIntervals.delete(pollingTaskId);
        },
      });

      const entry: PollingEntry = {
        poller: fallbackPoller,
        startedAt,
        intervalMs: SSE_FALLBACK_INTERVAL_MS,
        maxAttempts: config.maxAttempts ?? Infinity,
        eventSource: es,
        mode: 'sse',
      };
      activePollingIntervals.set(pollingTaskId, entry);

      console.log(`[SSE] Connected for task: ${pollingTaskId}`);

      // On SSE message: invoke callback immediately
      es.onmessage = async (event) => {
        if (stopped || callbackRunning) return;
        callbackRunning = true;
        try {
          const data = JSON.parse(event.data);

          // On terminal events, run callback one final time
          if (data.type === 'done') {
            await callback();
            stopPolling(pollingTaskId);
            return;
          }

          // On change/status/final events, run the callback to fetch full status
          if (data.type === 'change' || data.type === 'status' || data.type === 'final') {
            const result = await callback();
            // If callback says we're done, stop everything
            if (result.done) {
              stopPolling(pollingTaskId);
              return;
            }
          }
          // Heartbeat events: no action needed
        } catch {
          // Callback error - continue listening
        } finally {
          callbackRunning = false;
        }
      };

      // On SSE error: fall back to polling
      es.onerror = () => {
        if (stopped) return;
        console.warn(`[SSE] Connection lost for task: ${pollingTaskId}, falling back to ${SSE_FALLBACK_INTERVAL_MS / 1000}s polling`);

        // Close EventSource
        es.close();
        entry.eventSource = undefined;
        entry.mode = 'polling';

        // Start fallback polling
        fallbackPoller.start();
      };

      // Fire initial callback to get current state
      setTimeout(() => {
        if (!stopped) callback();
      }, 100);

      // Store stop hook
      const origStop = () => { stopped = true; };
      es.addEventListener('close', origStop);

      return;
    } catch {
      console.warn('[SSE] Failed to create EventSource, using polling fallback');
    }
  }

  // Fallback: use regular polling
  startPolling(pollingTaskId, callback, config);
}

// ============================================================================
// Public API (existing)
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
    mode: 'polling',
  });

  poller.start();
}

export function stopPolling(taskId: string): boolean {
  const entry = activePollingIntervals.get(taskId);
  if (!entry) return false;

  const state = entry.poller.getState();
  entry.poller.stop();

  // Close SSE connection if active
  if (entry.eventSource) {
    entry.eventSource.close();
    entry.eventSource = undefined;
  }

  activePollingIntervals.delete(taskId);

  const duration = Date.now() - entry.startedAt;
  console.log(`\u23f9\ufe0f Stopped ${entry.mode} for task: ${taskId} (duration: ${Math.round(duration / 1000)}s, attempts: ${state.attempts})`);

  return true;
}

export function cleanupAllPolling(): number {
  const count = activePollingIntervals.size;
  if (count === 0) return 0;

  console.log(`\ud83e\uddf9 Cleaning up ${count} active polling operations`);

  activePollingIntervals.forEach((entry, taskId) => {
    entry.poller.stop();
    if (entry.eventSource) {
      entry.eventSource.close();
      entry.eventSource = undefined;
    }
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

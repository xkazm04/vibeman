/**
 * Progress Emitter Types
 *
 * A unified interface for progress tracking across async operations.
 * The insight: execution time is unknowable, but relative progress through
 * structured work is estimable.
 *
 * The progressLines metric (0-100) serves as a normalized proxy for progress,
 * decoupling UI from execution details. Any async operation can implement
 * ProgressEmitter to enable unified progress visualization.
 *
 * Design Principles:
 * 1. Progress is normalized to 0-100 range (like progressLines)
 * 2. Progress is monotonically increasing (never goes backwards)
 * 3. Progress can be indeterminate (null) when estimation isn't possible
 * 4. Progress updates include optional semantic information (stage, message)
 *
 * Usage Areas:
 * - TaskRunner batch execution
 * - CLI session operations
 * - ScanQueue background jobs
 * - Remote batch delegation
 * - File operations (bulk delete, copy)
 * - LLM streaming responses
 */

/**
 * A snapshot of progress at a point in time
 */
export interface ProgressSnapshot {
  /**
   * Normalized progress value from 0 to 100.
   * null indicates indeterminate progress (spinner state).
   */
  progress: number | null;

  /**
   * Human-readable description of current stage/phase.
   * Examples: "Analyzing files", "Generating response", "Writing output"
   */
  stage?: string;

  /**
   * Optional detailed message about current work.
   * Examples: "Processing src/components/Button.tsx", "Token 1500/4000"
   */
  message?: string;

  /**
   * Timestamp when this snapshot was taken
   */
  timestamp: number;
}

/**
 * Callback signature for progress updates
 */
export type ProgressCallback = (snapshot: ProgressSnapshot) => void;

/**
 * Interface for any async operation that can emit progress
 */
export interface ProgressEmitter {
  /**
   * Subscribe to progress updates
   * @returns Unsubscribe function
   */
  onProgress(callback: ProgressCallback): () => void;

  /**
   * Get current progress snapshot (for polling-style consumers)
   */
  getProgress(): ProgressSnapshot;
}

/**
 * Configuration for creating a progress-emitting operation
 */
export interface ProgressEmitterConfig {
  /**
   * Initial stage description
   */
  initialStage?: string;

  /**
   * Whether progress starts as indeterminate (null)
   * Default: false (starts at 0)
   */
  indeterminate?: boolean;

  /**
   * Debounce interval for progress updates (ms)
   * Prevents UI thrashing with rapid updates
   * Default: 100ms
   */
  debounceMs?: number;
}

/**
 * Helper to create a simple progress emitter for manual control
 */
export function createProgressEmitter(config: ProgressEmitterConfig = {}): {
  emitter: ProgressEmitter;
  setProgress: (progress: number | null, stage?: string, message?: string) => void;
  complete: () => void;
} {
  const listeners = new Set<ProgressCallback>();
  let currentSnapshot: ProgressSnapshot = {
    progress: config.indeterminate ? null : 0,
    stage: config.initialStage,
    timestamp: Date.now(),
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debounceMs = config.debounceMs ?? 100;

  const notifyListeners = () => {
    listeners.forEach(callback => callback(currentSnapshot));
  };

  const setProgress = (progress: number | null, stage?: string, message?: string) => {
    // Enforce monotonic progress (except for indeterminate)
    if (progress !== null && currentSnapshot.progress !== null) {
      progress = Math.max(progress, currentSnapshot.progress);
    }
    // Clamp to 0-100
    if (progress !== null) {
      progress = Math.min(100, Math.max(0, progress));
    }

    currentSnapshot = {
      progress,
      stage: stage ?? currentSnapshot.stage,
      message,
      timestamp: Date.now(),
    };

    // Debounce notifications
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(notifyListeners, debounceMs);
  };

  const complete = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    currentSnapshot = {
      progress: 100,
      stage: 'Complete',
      timestamp: Date.now(),
    };
    notifyListeners();
  };

  const emitter: ProgressEmitter = {
    onProgress(callback: ProgressCallback) {
      listeners.add(callback);
      // Immediately emit current state
      callback(currentSnapshot);
      return () => listeners.delete(callback);
    },
    getProgress() {
      return { ...currentSnapshot };
    },
  };

  return { emitter, setProgress, complete };
}

/**
 * Convert raw count-based progress to normalized 0-100 scale
 *
 * @param current Current count (e.g., lines processed, items completed)
 * @param total Total count (e.g., total lines, total items)
 * @param floor Minimum progress value to show (prevents 0% for started work)
 * @returns Normalized progress 0-100
 *
 * @example
 * // 50 lines out of expected 100
 * normalizeProgress(50, 100) // returns 50
 *
 * // progressLines uses 100 as the baseline
 * normalizeProgress(progressLines, 100) // direct mapping
 */
export function normalizeProgress(current: number, total: number, floor = 0): number {
  if (total <= 0) return floor;
  const normalized = (current / total) * 100;
  return Math.min(100, Math.max(floor, normalized));
}

/**
 * Map progressLines (0-100 raw value) to percentage for UI
 * This is the current TaskRunner convention: 100 progressLines = 100%
 *
 * @param progressLines Raw progressLines value from task status
 * @returns Percentage 0-100
 */
export function progressLinesToPercent(progressLines: number): number {
  return normalizeProgress(progressLines, 100);
}

/**
 * Type guard to check if an object implements ProgressEmitter
 */
export function isProgressEmitter(obj: unknown): obj is ProgressEmitter {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.onProgress === 'function' &&
    typeof candidate.getProgress === 'function'
  );
}

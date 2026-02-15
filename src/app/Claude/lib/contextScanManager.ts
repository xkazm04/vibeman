/**
 * Context Scan Manager
 * Handles context scanning execution and status tracking
 */

import { executeRequirementAsync, getTaskStatus } from './requirementApi';

export interface ContextScanState {
  isScanning: boolean;
  taskId: string | null;
  startTime: number | null;
  error: string | null;
}

export type ContextScanStatus = 'idle' | 'running' | 'completed' | 'failed' | 'session-limit';

export interface ContextScanCallbacks {
  onStart?: () => void;
  onProgress?: (status: ContextScanStatus) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Start a context scan
 */
export async function startContextScan(
  projectPath: string,
  projectId: string,
  callbacks?: ContextScanCallbacks
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    callbacks?.onStart?.();

    // Create the task
    const result = await executeRequirementAsync(projectPath, 'scan-contexts', projectId);
    return { success: true, taskId: result.taskId };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to start scan';
    callbacks?.onError?.(error);
    return { success: false, error };
  }
}

/**
 * Poll context scan status
 * Returns a cleanup function to stop polling
 */
export function pollContextScanStatus(
  taskId: string,
  callbacks?: ContextScanCallbacks
): () => void {
  let pollCount = 0;
  const maxPolls = 600; // 10 minutes max (60 * 10 seconds)

  let isPolling = false;
  const pollInterval = setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      pollCount++;
      // Timeout safeguard
      if (pollCount >= maxPolls) {        clearInterval(pollInterval);
        callbacks?.onError?.('Execution timeout - task did not complete within 10 minutes');
        return;
      }

      const task = await getTaskStatus(taskId);

      // Report progress
      callbacks?.onProgress?.(task.status);

      // Stop polling if completed
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'session-limit') {        clearInterval(pollInterval);

        if (task.status === 'completed') {          callbacks?.onComplete?.();
        } else if (task.status === 'failed') {          callbacks?.onError?.(task.error || 'Scan failed');
        } else if (task.status === 'session-limit') {          callbacks?.onError?.('Session limit reached');
        }
      }
    } catch (pollErr) {
      // Log error but continue polling — transient network errors should not stop the scan
      console.warn('[contextScanManager] Poll error (will retry):', pollErr instanceof Error ? pollErr.message : pollErr);
    } finally {
      isPolling = false;
    }
  }, 10000); // Poll every 10 seconds

  // Return cleanup function
  return () => {    clearInterval(pollInterval);
  };
}

/**
 * Calculate estimated progress (0-100) based on elapsed time
 * Assumes 5 minutes for full completion
 */
export function calculateProgress(startTime: number): number {
  const elapsed = Date.now() - startTime;
  const fiveMinutesMs = 5 * 60 * 1000;
  const progress = Math.min((elapsed / fiveMinutesMs) * 100, 95); // Cap at 95% until actual completion
  return Math.round(progress);
}

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
  console.log('[ContextScan] 🎯 Starting context scan...');

  try {
    callbacks?.onStart?.();

    // Create the task
    console.log('[ContextScan] 📤 Creating task...');
    const { taskId } = await executeRequirementAsync(projectPath, 'scan-contexts', projectId);
    console.log('[ContextScan] ✅ Task created with ID:', taskId);

    return { success: true, taskId };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to start scan';
    console.error('[ContextScan] 💥 Error starting context scan:', error);
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
  console.log('[ContextScan] 🔄 Starting status polling (every 10 seconds)...');

  let pollCount = 0;
  const maxPolls = 600; // 10 minutes max (60 * 10 seconds)

  const pollInterval = setInterval(async () => {
    pollCount++;
    console.log(`[ContextScan] 🔍 Poll #${pollCount}...`);

    // Timeout safeguard
    if (pollCount >= maxPolls) {
      console.error('[ContextScan] ⏱️ Timeout reached (10 minutes) - stopping poll');
      clearInterval(pollInterval);
      callbacks?.onError?.('Execution timeout - task did not complete within 10 minutes');
      return;
    }

    try {
      const task = await getTaskStatus(taskId);

      // Report progress
      callbacks?.onProgress?.(task.status);

      // Stop polling if completed
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'session-limit') {
        console.log(`[ContextScan] 🏁 Task finished with status: ${task.status}`);
        clearInterval(pollInterval);

        if (task.status === 'completed') {
          console.log('[ContextScan] ✅ Context scan completed successfully');
          callbacks?.onComplete?.();
        } else if (task.status === 'failed') {
          console.error('[ContextScan] ❌ Context scan failed:', task.error);
          callbacks?.onError?.(task.error || 'Scan failed');
        } else if (task.status === 'session-limit') {
          console.error('[ContextScan] 🚫 Session limit reached');
          callbacks?.onError?.('Session limit reached');
        }
      }
    } catch (pollErr) {
      console.error('[ContextScan] ❌ Error polling status (will retry):', pollErr);
      // Don't stop polling on error, retry
    }
  }, 10000); // Poll every 10 seconds

  // Return cleanup function
  return () => {
    console.log('[ContextScan] 🛑 Stopping poll');
    clearInterval(pollInterval);
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

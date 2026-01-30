/**
 * CLI Execution Manager
 *
 * Manages CLI task execution with polling, recovery, and background processing.
 * Similar to TaskRunner's polling manager but for CLI sessions.
 */

import { useCLISessionStore, type CLISessionId } from './cliSessionStore';
import type { QueuedTask } from '../types';
// Import directly to avoid circular dependency through barrel exports
import { remoteEvents } from '@/lib/remote/eventPublisher';

// Polling state per session
interface PollingState {
  intervalId: NodeJS.Timeout;
  executionId: string;
  startedAt: number;
}

// Module-level polling tracking (survives component re-renders)
const activePolling: Map<CLISessionId, PollingState> = new Map();

// Execution stream tracking
const activeStreams: Map<string, EventSource> = new Map();

// Requirements cache (for finding next task after completion)
let cachedRequirements: Array<{
  id: string;
  projectPath: string;
  requirementName: string;
}> = [];

/**
 * Cache requirements for use in polling callbacks
 */
export function setCachedRequirements(
  requirements: Array<{ id: string; projectPath: string; requirementName: string }>
): void {
  cachedRequirements = [...requirements];
}

/**
 * Get cached requirements
 */
export function getCachedRequirements() {
  return cachedRequirements;
}

/**
 * Start CLI execution for a task
 */
export async function startCLIExecution(
  sessionId: CLISessionId,
  task: QueuedTask,
  resumeSessionId?: string | null
): Promise<{ success: boolean; streamUrl?: string; error?: string }> {
  const store = useCLISessionStore.getState();

  // Update task status to running
  store.updateTaskStatus(sessionId, task.id, 'running');
  store.setRunning(sessionId, true);

  try {
    const response = await fetch('/api/claude-terminal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: task.projectPath,
        prompt: `Execute the requirement file: ${task.requirementName}`,
        resumeSessionId: resumeSessionId || undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      store.updateTaskStatus(sessionId, task.id, 'failed');
      store.setRunning(sessionId, false);
      return { success: false, error: err.error || 'Failed to start execution' };
    }

    const { streamUrl, executionId } = await response.json();

    // Start monitoring the execution
    startExecutionMonitoring(sessionId, task, executionId, streamUrl);

    return { success: true, streamUrl };
  } catch (error) {
    store.updateTaskStatus(sessionId, task.id, 'failed');
    store.setRunning(sessionId, false);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start monitoring a CLI execution via SSE
 */
function startExecutionMonitoring(
  sessionId: CLISessionId,
  task: QueuedTask,
  executionId: string,
  streamUrl: string
): void {
  const store = useCLISessionStore.getState();

  // Close any existing stream for this session
  const existingStream = activeStreams.get(sessionId);
  if (existingStream) {
    existingStream.close();
    activeStreams.delete(sessionId);
  }

  // Connect to SSE stream
  const eventSource = new EventSource(streamUrl);
  activeStreams.set(sessionId, eventSource);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Update session activity
      store.updateLastActivity(sessionId);

      // Handle completion events
      if (data.type === 'result') {
        const claudeSessionId = data.data?.sessionId;
        if (claudeSessionId) {
          store.setClaudeSessionId(sessionId, claudeSessionId);
        }

        // Task completed successfully
        handleTaskComplete(sessionId, task, true);
        eventSource.close();
        activeStreams.delete(sessionId);
      } else if (data.type === 'error') {
        // Task failed
        handleTaskComplete(sessionId, task, false);
        eventSource.close();
        activeStreams.delete(sessionId);
      }
    } catch (e) {
      console.error('[CLI] Failed to parse SSE:', e);
    }
  };

  eventSource.onerror = () => {
    // Connection lost - start polling fallback
    eventSource.close();
    activeStreams.delete(sessionId);
    startPollingFallback(sessionId, task, executionId);
  };

  // Store polling state for recovery
  const pollingState: PollingState = {
    intervalId: setTimeout(() => {}, 0), // Placeholder
    executionId,
    startedAt: Date.now(),
  };
  activePolling.set(sessionId, pollingState);
}

/**
 * Fallback polling when SSE disconnects
 */
function startPollingFallback(
  sessionId: CLISessionId,
  task: QueuedTask,
  executionId: string
): void {
  // Check if we already have polling for this session
  const existing = activePolling.get(sessionId);
  if (existing && existing.intervalId) {
    clearInterval(existing.intervalId);
  }

  const intervalId = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/claude-terminal/status?executionId=${executionId}`
      );

      if (!response.ok) {
        console.warn('[CLI] Status check failed, will retry');
        return;
      }

      const status = await response.json();

      if (status.completed) {
        clearInterval(intervalId);
        activePolling.delete(sessionId);
        handleTaskComplete(sessionId, task, status.success);
      }
    } catch (error) {
      console.warn('[CLI] Polling error, will retry:', error);
      // Continue polling on error
    }
  }, 10000); // Poll every 10 seconds

  activePolling.set(sessionId, {
    intervalId,
    executionId,
    startedAt: Date.now(),
  });
}

/**
 * Handle task completion - cleanup and start next task
 */
async function handleTaskComplete(
  sessionId: CLISessionId,
  task: QueuedTask,
  success: boolean
): Promise<void> {
  const store = useCLISessionStore.getState();
  const session = store.sessions[sessionId];

  // Update task status
  store.updateTaskStatus(sessionId, task.id, success ? 'completed' : 'failed');

  // Publish completion/failure event to Supabase for Butler
  if (task.projectId) {
    if (success) {
      remoteEvents.taskCompleted(task.projectId, {
        taskId: task.id,
        title: task.requirementName,
        batchId: sessionId, // Use session ID as batch identifier
      });
    } else {
      remoteEvents.taskFailed(task.projectId, {
        taskId: task.id,
        title: task.requirementName,
        batchId: sessionId,
        error: 'Task execution failed',
      });
    }
  }

  if (success) {
    // Delete requirement file
    try {
      await fetch('/api/claude-code/requirement', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: task.projectPath,
          requirementName: task.requirementName,
        }),
      });
    } catch (error) {
      console.error('[CLI] Failed to delete requirement:', error);
    }

    // Update idea status
    try {
      await fetch('/api/ideas/update-implementation-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementName: task.requirementName }),
      });
    } catch {
      // Non-critical
    }

    // Remove task from queue after brief delay
    setTimeout(() => {
      store.removeTask(sessionId, task.id);
    }, 2000);
  }

  // Check for next task
  setTimeout(() => {
    executeNextTask(sessionId);
  }, 3000);
}

/**
 * Execute next pending task in session queue
 */
export function executeNextTask(sessionId: CLISessionId): void {
  const store = useCLISessionStore.getState();
  const session = store.sessions[sessionId];

  if (!session.autoStart) {
    store.setRunning(sessionId, false);
    return;
  }

  // Find next pending task
  const nextTask = session.queue.find((t) => t.status === 'pending');

  if (!nextTask) {
    // Queue empty
    store.setRunning(sessionId, false);
    store.setAutoStart(sessionId, false);
    return;
  }

  // Start execution with session resume
  startCLIExecution(sessionId, nextTask, session.claudeSessionId);
}

/**
 * Check if a requirement file still exists
 */
async function checkRequirementExists(projectPath: string, requirementName: string): Promise<boolean> {
  try {
    const response = await fetch('/api/claude-code/requirement/exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, requirementName }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.exists === true;
    }
    return false;
  } catch {
    // If we can't check, assume it doesn't exist (task completed)
    return false;
  }
}

/**
 * Recover CLI sessions after page refresh
 */
export async function recoverCLISessions(): Promise<void> {
  const store = useCLISessionStore.getState();
  const sessionsToRecover = store.getSessionsNeedingRecovery();

  if (sessionsToRecover.length === 0) {
    console.log('[CLI] No sessions need recovery');
    return;
  }

  console.log(`[CLI] Recovering ${sessionsToRecover.length} session(s)`);

  for (const session of sessionsToRecover) {
    // Check if we have a running task that needs monitoring
    const runningTask = session.queue.find((t) => t.status === 'running');

    if (runningTask) {
      // Check if the requirement file still exists
      const exists = await checkRequirementExists(runningTask.projectPath, runningTask.requirementName);

      if (exists) {
        // Task was interrupted - restart it
        console.log(`[CLI] Session ${session.id}: Restarting interrupted task ${runningTask.requirementName}`);
        store.updateTaskStatus(session.id, runningTask.id, 'pending');
      } else {
        // Requirement file was deleted - task completed successfully
        console.log(`[CLI] Session ${session.id}: Task ${runningTask.requirementName} already completed`);
        store.updateTaskStatus(session.id, runningTask.id, 'completed');
        // Remove from queue after short delay
        setTimeout(() => {
          store.removeTask(session.id, runningTask.id);
        }, 1000);
      }
    }

    // If autoStart was true and there are still pending tasks, continue execution
    const updatedSession = store.sessions[session.id];
    const hasPendingTasks = updatedSession.queue.some((t) => t.status === 'pending');

    if (session.autoStart && hasPendingTasks) {
      console.log(`[CLI] Session ${session.id}: Resuming queue execution`);
      store.setRunning(session.id, true);
      setTimeout(() => executeNextTask(session.id), 1000);
    } else if (!hasPendingTasks) {
      // No more pending tasks - clear autoStart
      console.log(`[CLI] Session ${session.id}: No pending tasks, clearing autoStart`);
      store.setAutoStart(session.id, false);
      store.setRunning(session.id, false);
    }
  }
}

/**
 * Stop all polling for a session
 */
export function stopSessionPolling(sessionId: CLISessionId): void {
  const polling = activePolling.get(sessionId);
  if (polling) {
    clearInterval(polling.intervalId);
    activePolling.delete(sessionId);
  }

  const stream = activeStreams.get(sessionId);
  if (stream) {
    stream.close();
    activeStreams.delete(sessionId);
  }
}

/**
 * Abort a session's current execution and cleanup
 * Used when user wants to delete/cancel a running session
 */
export async function abortSessionExecution(sessionId: CLISessionId): Promise<boolean> {
  const store = useCLISessionStore.getState();
  const session = store.sessions[sessionId];

  // Stop any polling/streaming first
  stopSessionPolling(sessionId);

  // Try to abort the execution via API if we have an execution ID
  if (session.currentExecutionId) {
    try {
      const response = await fetch(
        `/api/claude-terminal/query?executionId=${session.currentExecutionId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        console.log(`[CLI] Aborted execution ${session.currentExecutionId}`);
      } else {
        console.warn(`[CLI] Failed to abort execution ${session.currentExecutionId}`);
      }
    } catch (error) {
      console.error('[CLI] Error aborting execution:', error);
    }
  }

  // Clear the session state
  store.clearSession(sessionId);

  return true;
}

/**
 * Cleanup all CLI sessions (on unmount)
 */
export function cleanupAllCLISessions(): void {
  for (const [sessionId] of activePolling) {
    stopSessionPolling(sessionId);
  }
}

/**
 * Get session execution status
 */
export function getSessionExecutionStatus(sessionId: CLISessionId): {
  isPolling: boolean;
  isStreaming: boolean;
  executionId?: string;
} {
  const polling = activePolling.get(sessionId);
  const stream = activeStreams.get(sessionId);

  return {
    isPolling: !!polling,
    isStreaming: !!stream,
    executionId: polling?.executionId,
  };
}

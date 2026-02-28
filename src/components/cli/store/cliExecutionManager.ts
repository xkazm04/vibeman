/**
 * CLI Execution Manager
 *
 * Manages CLI task execution with recovery and background processing.
 * Delegates actual execution, streaming, and cancellation to the
 * ExecutionStrategy pattern (TerminalStrategy by default).
 */

import { useCLISessionStore, type CLISessionId } from './cliSessionStore';
import type { QueuedTask } from '../types';
// Import directly to avoid circular dependency through barrel exports
import { remoteEvents } from '@/lib/remote/eventPublisher';
import {
  createStrategy,
  type ExecutionStrategy,
  type ExecutionEvent,
  hasCapability,
} from '@/app/features/TaskRunner/lib/executionStrategy';
import {
  createRunningStatus,
  createFailedStatus,
  createCompletedStatus,
  createQueuedStatus,
} from '@/app/features/TaskRunner/lib/types';
// Register strategies on import
import '@/app/features/TaskRunner/lib/strategies/terminalStrategy';
import '@/app/features/TaskRunner/lib/strategies/vscodeStrategy';

// ============ Shared Task Completion Utilities ============

/**
 * Delete a requirement file after successful completion
 * Shared by cliExecutionManager and CLIBatchPanel
 */
export async function deleteRequirementFile(
  projectPath: string,
  requirementName: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/claude-code/requirement', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, requirementName }),
    });
    return response.ok;
  } catch (error) {
    console.error('[CLI] Failed to delete requirement:', error);
    return false;
  }
}

/**
 * Update idea status to implemented
 * Shared by cliExecutionManager and CLIBatchPanel
 */
export async function updateIdeaImplementationStatus(
  requirementName: string
): Promise<void> {
  try {
    await fetch('/api/ideas/update-implementation-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementName }),
    });
  } catch {
    // Non-critical - silently ignore
  }
}

/**
 * Ensure an implementation log exists for a completed task.
 * Checks existing logs and creates a fallback if none found.
 * This guarantees a log is always created after CLI execution,
 * even if Claude didn't call the log_implementation MCP tool.
 */
async function ensureImplementationLog(
  projectId: string,
  requirementName: string,
  contextId?: string | null
): Promise<void> {
  try {
    // Check if a log already exists for this requirement
    const resp = await fetch(
      `/api/implementation-logs?projectId=${encodeURIComponent(projectId)}&limit=50`
    );
    if (resp.ok) {
      const { logs } = await resp.json();
      const exists = Array.isArray(logs) && logs.some(
        (log: { requirement_name?: string }) => log.requirement_name === requirementName
      );
      if (exists) return; // Log already created by MCP tool — nothing to do
    }

    // No log found — create a fallback via the simplified endpoint (which also emits brain signal + updates idea)
    await fetch('/api/implementation-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        requirementName,
        title: `Implementation: ${requirementName}`,
        overview: 'Auto-generated after successful CLI execution (no MCP log_implementation call detected).',
        contextId: contextId || undefined,
      }),
    });
  } catch {
    // Non-critical — best-effort fallback
  }
}

/**
 * Perform post-completion cleanup for a successful task.
 * Sequential cascade: update status → ensure log → delete file.
 * The requirement file must stay on disk until status/log updates
 * finish, since downstream endpoints may reference the idea by name.
 *
 * @returns true if requirement was deleted successfully
 */
export async function performTaskCleanup(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<boolean> {
  // 1. Update idea status (await so it completes before file deletion)
  await updateIdeaImplementationStatus(requirementName);

  // 2. Ensure implementation log exists — creates fallback if MCP tool was skipped
  if (projectId) {
    await ensureImplementationLog(projectId, requirementName).catch(() => {});
  }

  // 3. Delete requirement file last — after all lookups are done
  return deleteRequirementFile(projectPath, requirementName);
}

// ============================================================================
// Strategy-backed execution
// ============================================================================

// Per-session strategy instances and stream unsubscribers
const sessionStrategies = new Map<CLISessionId, ExecutionStrategy>();
const sessionUnsubscribers = new Map<CLISessionId, () => void>();
// Track executionId per session for cancel/cleanup
const sessionExecutionIds = new Map<CLISessionId, string>();

/**
 * Get or create the execution strategy for a session.
 * Routes to 'vscode' strategy when session provider is 'vscode',
 * otherwise uses 'terminal' strategy (for claude/gemini).
 */
function getSessionStrategy(sessionId: CLISessionId): ExecutionStrategy {
  let strategy = sessionStrategies.get(sessionId);
  if (!strategy) {
    const store = useCLISessionStore.getState();
    const session = store.sessions[sessionId];
    const strategyType = session?.provider === 'vscode' ? 'vscode' : 'terminal';
    strategy = createStrategy(strategyType);
    sessionStrategies.set(sessionId, strategy);
  }
  return strategy;
}

/**
 * Clear cached strategy for a session.
 * Call when the provider changes so the next execution creates the correct strategy.
 */
export function clearSessionStrategy(sessionId: CLISessionId): void {
  const existing = sessionStrategies.get(sessionId);
  if (existing) {
    existing.cleanup();
    sessionStrategies.delete(sessionId);
  }
}

// Auto-cleanup: close SSE connections on page unload to prevent connection leaks.
// Browsers limit to 6 connections per domain (HTTP/1.1); orphaned EventSource
// connections consume these slots and cause UI freezes.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupAllCLISessions();
  });
}

/**
 * Start CLI execution for a task via the ExecutionStrategy.
 */
export async function startCLIExecution(
  sessionId: CLISessionId,
  task: QueuedTask,
  resumeSessionId?: string | null
): Promise<{ success: boolean; streamUrl?: string; error?: string }> {
  const store = useCLISessionStore.getState();
  const strategy = getSessionStrategy(sessionId);

  // Update task status to running
  store.updateTaskStatus(sessionId, task.id, createRunningStatus());
  store.setRunning(sessionId, true);

  // Read session provider/model config
  const session = store.sessions[sessionId];

  // Execute via strategy
  const result = await strategy.execute(
    {
      id: task.id,
      projectId: task.projectId,
      projectPath: task.projectPath,
      projectName: task.projectName,
      requirementName: task.requirementName,
      directPrompt: task.directPrompt,
    },
    {
      resumeSessionId: resumeSessionId || undefined,
      provider: session.provider,
      model: session.model,
    }
  );

  if (!result.success) {
    store.updateTaskStatus(sessionId, task.id, createFailedStatus(result.error || 'Failed to start execution'));
    store.setRunning(sessionId, false);
    return { success: false, error: result.error || 'Failed to start execution' };
  }

  const executionId = result.executionId!;
  sessionExecutionIds.set(sessionId, executionId);

  // Subscribe to execution events for monitoring if supported
  if (hasCapability(strategy, 'stream')) {
    const unsubscribe = strategy.stream(executionId, (event: ExecutionEvent) => {
      store.updateLastActivity(sessionId);

      if (event.type === 'result') {
        // Extract claude session ID if present
        const eventData = event.data as Record<string, any> | undefined;
        const claudeSessionId = eventData?.data?.sessionId || eventData?.claudeSessionId;
        if (claudeSessionId) {
          store.setClaudeSessionId(sessionId, claudeSessionId);
        }

        handleTaskComplete(sessionId, task, true);
        cleanupSessionExecution(sessionId);
      } else if (event.type === 'error') {
        handleTaskComplete(sessionId, task, false);
        cleanupSessionExecution(sessionId);
      }
    });

    // Store unsubscriber for cleanup
    sessionUnsubscribers.set(sessionId, unsubscribe);
  } else {
    // If strategy doesn't support streaming, we need an alternative way to detect completion.
    // For now, Terminal and VSCode both support it, so this is just for type safety.
    console.warn(`[CLI] Strategy ${strategy.name} does not support streaming - completion detection may fail.`);
  }

  return { success: true, streamUrl: result.streamUrl };
}

/**
 * Clean up execution resources for a session (unsubscribe stream, remove tracking)
 */
function cleanupSessionExecution(sessionId: CLISessionId): void {
  const unsubscribe = sessionUnsubscribers.get(sessionId);
  if (unsubscribe) {
    unsubscribe();
    sessionUnsubscribers.delete(sessionId);
  }
  sessionExecutionIds.delete(sessionId);
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

  // Update task status
  store.updateTaskStatus(
    sessionId,
    task.id,
    success ? createCompletedStatus() : createFailedStatus('Task execution failed')
  );

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
    // Perform shared cleanup (delete requirement, update idea status, ensure log)
    await performTaskCleanup(task.projectPath, task.requirementName, task.projectId);

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

  // Find next queued task
  const nextTask = session.queue.find((t) => t.status.type === 'queued');

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
    return;
  }

  for (const session of sessionsToRecover) {
    // Check if we have a running task that needs monitoring
    const runningTask = session.queue.find((t) => t.status.type === 'running');

    if (runningTask) {
      // Check if the requirement file still exists
      const exists = await checkRequirementExists(runningTask.projectPath, runningTask.requirementName);

      if (exists) {
        // Task was interrupted - restart it (re-queue)
        store.updateTaskStatus(session.id, runningTask.id, createQueuedStatus());
      } else {
        // Requirement file was deleted - task completed successfully
        store.updateTaskStatus(session.id, runningTask.id, createCompletedStatus());
        // Remove from queue after short delay
        setTimeout(() => {
          store.removeTask(session.id, runningTask.id);
        }, 1000);
      }
    }

    // If autoStart was true and there are still queued tasks, continue execution
    const updatedSession = store.sessions[session.id];
    const hasQueuedTasks = updatedSession.queue.some((t) => t.status.type === 'queued');

    if (session.autoStart && hasQueuedTasks) {
      store.setRunning(session.id, true);
      setTimeout(() => executeNextTask(session.id), 1000);
    } else if (!hasQueuedTasks) {
      // No more pending tasks - clear autoStart
      store.setAutoStart(session.id, false);
      store.setRunning(session.id, false);
    }
  }
}

/**
 * Stop execution monitoring for a session
 */
export function stopSessionPolling(sessionId: CLISessionId): void {
  cleanupSessionExecution(sessionId);
}

/**
 * Abort a session's current execution and cleanup
 * Used when user wants to delete/cancel a running session
 */
export async function abortSessionExecution(sessionId: CLISessionId): Promise<boolean> {
  const store = useCLISessionStore.getState();
  const session = store.sessions[sessionId];

  // Cancel via strategy if we have an execution ID
  const executionId = sessionExecutionIds.get(sessionId) || session.currentExecutionId;
  if (executionId) {
    const strategy = getSessionStrategy(sessionId);
    try {
      await strategy.cancel(executionId);
    } catch (error) {
      console.error('[CLI] Error aborting execution:', error);
    }
  }

  // Clean up execution resources
  cleanupSessionExecution(sessionId);

  // Clear the session state
  store.clearSession(sessionId);

  return true;
}

/**
 * Cleanup all CLI sessions — stops monitoring and releases strategy resources.
 * Call on component unmount to prevent connection leaks.
 */
export function cleanupAllCLISessions(): void {
  // Clean up all execution subscriptions
  for (const sessionId of sessionUnsubscribers.keys()) {
    cleanupSessionExecution(sessionId as CLISessionId);
  }
  // Clean up all strategy instances
  for (const [sessionId, strategy] of sessionStrategies) {
    strategy.cleanup();
  }
  sessionStrategies.clear();
}

/**
 * Get the count of active executions (useful for debugging connection limits).
 */
export function getActiveStreamCount(): number {
  return sessionExecutionIds.size;
}

/**
 * Get session execution status
 */
export function getSessionExecutionStatus(sessionId: CLISessionId): {
  isPolling: boolean;
  isStreaming: boolean;
  executionId?: string;
} {
  const executionId = sessionExecutionIds.get(sessionId);
  const hasSubscription = sessionUnsubscribers.has(sessionId);

  return {
    isPolling: false, // Strategy handles polling internally
    isStreaming: hasSubscription,
    executionId,
  };
}

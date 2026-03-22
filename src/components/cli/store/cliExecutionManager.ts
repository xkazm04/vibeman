/**
 * CLI Execution Manager
 *
 * Manages CLI task execution with recovery and background processing.
 * Supports DAG-based parallel execution: tasks with declared dependencies
 * are scheduled via a DAG resolver, while independent tasks run concurrently.
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
import { registerTaskComplete } from '../taskRegistry';
import { DAGScheduler, type DAGTask, type DAGTaskStatus } from '@/lib/dag/dagScheduler';

// ============ Shared Task Completion Utilities ============
// Re-exported from unified execution layer for backward compatibility.
// Canonical implementation lives in @/lib/execution/taskCleanup.ts.

import {
  performTaskCleanup as sharedPerformTaskCleanup,
  deleteRequirementFile as sharedDeleteRequirementFile,
  updateIdeaImplementationStatus as sharedUpdateIdeaImplementationStatus,
} from '@/lib/execution/taskCleanup';

/** @deprecated Import from '@/lib/execution/taskCleanup' instead */
export const deleteRequirementFile = (projectPath: string, requirementName: string) =>
  sharedDeleteRequirementFile(projectPath, requirementName);

/** @deprecated Import from '@/lib/execution/taskCleanup' instead */
export const updateIdeaImplementationStatus = (requirementName: string) =>
  sharedUpdateIdeaImplementationStatus(requirementName);

/** @deprecated Import from '@/lib/execution/taskCleanup' instead */
export const performTaskCleanup = (projectPath: string, requirementName: string, projectId?: string) =>
  sharedPerformTaskCleanup({ projectPath, requirementName, projectId });

// ============================================================================
// Strategy-backed execution
// ============================================================================

// Per-session strategy instances and stream unsubscribers
const sessionStrategies = new Map<CLISessionId, ExecutionStrategy>();
const sessionUnsubscribers = new Map<CLISessionId, Map<string, () => void>>();
// Track executionIds per session (multiple for parallel DAG execution)
const sessionExecutionIds = new Map<CLISessionId, Map<string, string>>();

/** Default max parallel tasks per CLI session */
const DEFAULT_MAX_PARALLEL = 10;

/** Per-session DAG scheduler instances */
const sessionSchedulers = new Map<CLISessionId, DAGScheduler>();

function getSessionScheduler(sessionId: CLISessionId): DAGScheduler {
  let scheduler = sessionSchedulers.get(sessionId);
  if (!scheduler) {
    scheduler = new DAGScheduler({ maxParallel: DEFAULT_MAX_PARALLEL });
    sessionSchedulers.set(sessionId, scheduler);
  }
  return scheduler;
}

function queueStatusToDAG(status: QueuedTask['status']): DAGTaskStatus {
  switch (status.type) {
    case 'idle':
    case 'queued': return 'pending';
    case 'running': return 'running';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
  }
}

function queueToDAGTasks(queue: QueuedTask[]): DAGTask[] {
  return queue.map(t => ({
    id: t.id,
    status: queueStatusToDAG(t.status),
    dependencies: t.dependencies || [],
  }));
}

/**
 * Get or create the execution strategy for a session.
 * Uses 'terminal' strategy for all CLI providers (claude/ollama).
 */
function getSessionStrategy(sessionId: CLISessionId): ExecutionStrategy {
  let strategy = sessionStrategies.get(sessionId);
  if (!strategy) {
    strategy = createStrategy('terminal');
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

  // Track execution ID per task (supports multiple concurrent tasks)
  if (!sessionExecutionIds.has(sessionId)) {
    sessionExecutionIds.set(sessionId, new Map());
  }
  sessionExecutionIds.get(sessionId)!.set(task.id, executionId);

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
        cleanupTaskExecution(sessionId, task.id);
      } else if (event.type === 'error') {
        handleTaskComplete(sessionId, task, false);
        cleanupTaskExecution(sessionId, task.id);
      }
    });

    // Store unsubscriber per task
    if (!sessionUnsubscribers.has(sessionId)) {
      sessionUnsubscribers.set(sessionId, new Map());
    }
    sessionUnsubscribers.get(sessionId)!.set(task.id, unsubscribe);
  } else {
    // If strategy doesn't support streaming, we need an alternative way to detect completion.
    // For now, Terminal and VSCode both support it, so this is just for type safety.
    console.warn(`[CLI] Strategy ${strategy.name} does not support streaming - completion detection may fail.`);
  }

  return { success: true, streamUrl: result.streamUrl };
}

/**
 * Clean up execution resources for a specific task within a session
 */
function cleanupTaskExecution(sessionId: CLISessionId, taskId: string): void {
  const unsubs = sessionUnsubscribers.get(sessionId);
  if (unsubs) {
    const unsubscribe = unsubs.get(taskId);
    if (unsubscribe) {
      unsubscribe();
      unsubs.delete(taskId);
    }
    if (unsubs.size === 0) sessionUnsubscribers.delete(sessionId);
  }

  const execIds = sessionExecutionIds.get(sessionId);
  if (execIds) {
    execIds.delete(taskId);
    if (execIds.size === 0) sessionExecutionIds.delete(sessionId);
  }
}

/**
 * Clean up all execution resources for a session
 */
function cleanupSessionExecution(sessionId: CLISessionId): void {
  const unsubs = sessionUnsubscribers.get(sessionId);
  if (unsubs) {
    for (const unsubscribe of unsubs.values()) {
      unsubscribe();
    }
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

  // Mark task as complete in server registry (prevents 409 when next task starts)
  registerTaskComplete(task.id, sessionId, success).catch(() => {});

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

  // Re-evaluate DAG: launch any tasks whose dependencies are now satisfied
  setTimeout(() => {
    executeReadyTasks(sessionId);
  }, 1000);
}

/**
 * Execute all ready tasks in session queue using DAG scheduling.
 * Tasks with no dependencies (or all dependencies met) run in parallel,
 * up to the session's max parallelism limit.
 */
export function executeReadyTasks(sessionId: CLISessionId): void {
  const store = useCLISessionStore.getState();
  const session = store.sessions[sessionId];

  if (!session.autoStart) {
    store.setRunning(sessionId, false);
    return;
  }

  const scheduler = getSessionScheduler(sessionId);
  const dagTasks = queueToDAGTasks(session.queue);
  const readyIds = scheduler.getNextBatch(dagTasks);

  if (readyIds.length === 0) {
    // Check if we're truly done (no running tasks either)
    const hasRunning = session.queue.some(t => t.status.type === 'running');
    if (!hasRunning) {
      store.setRunning(sessionId, false);
      store.setAutoStart(sessionId, false);
    }
    return;
  }

  // Launch all ready tasks in parallel
  for (const taskId of readyIds) {
    const task = session.queue.find(t => t.id === taskId);
    if (task) {
      startCLIExecution(sessionId, task, session.claudeSessionId);
    }
  }
}

/**
 * Execute next pending task in session queue.
 * Delegates to DAG-aware executeReadyTasks which handles both
 * sequential (no dependencies) and parallel (with dependencies) execution.
 */
export function executeNextTask(sessionId: CLISessionId): void {
  executeReadyTasks(sessionId);
}

/** Max auto-retries for tasks that fail due to server restart / transient errors */
const MAX_TASK_RETRIES = 3;

/** Max attempts to reach the server during recovery before giving up */
const MAX_RECOVERY_ATTEMPTS = 5;

/** Base delay between recovery attempts (doubles each attempt) */
const RECOVERY_BASE_DELAY_MS = 1000;

/**
 * Check if a requirement file still exists.
 * Returns { exists: boolean; reachable: boolean } to distinguish between
 * "file doesn't exist" and "server unreachable".
 */
async function checkRequirementExists(
  projectPath: string,
  requirementName: string
): Promise<{ exists: boolean; reachable: boolean }> {
  try {
    const response = await fetch('/api/claude-code/requirement/exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, requirementName }),
    });
    if (response.ok) {
      const data = await response.json();
      return { exists: data.exists === true, reachable: true };
    }
    // Server responded but with an error — still reachable
    return { exists: true, reachable: true };
  } catch {
    // Server unreachable (restarting) — safe default: assume file exists (re-queue)
    return { exists: true, reachable: false };
  }
}

/**
 * Check if the server has an active execution for a given execution ID.
 * Returns the execution status or null if not found/unreachable.
 */
async function checkServerExecution(executionId: string): Promise<{
  found: boolean;
  status?: string;
  sessionId?: string;
} | null> {
  try {
    const res = await fetch(
      `/api/claude-terminal/query?executionId=${encodeURIComponent(executionId)}`
    );
    if (!res.ok) return { found: false };
    const data = await res.json();
    if (data.success && data.execution) {
      return {
        found: true,
        status: data.execution.status,
        sessionId: data.execution.sessionId,
      };
    }
    return { found: false };
  } catch {
    return null; // Server unreachable
  }
}

/**
 * Wait for the server to become reachable with exponential backoff.
 * Returns true if server is reachable, false if max attempts exceeded.
 */
async function waitForServer(maxAttempts = MAX_RECOVERY_ATTEMPTS): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch('/api/system-status', { method: 'GET' });
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = RECOVERY_BASE_DELAY_MS * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false;
}

/**
 * Recover CLI sessions after page refresh.
 *
 * Key insight: On hard refresh, the server-side CLI processes keep running.
 * Recovery must NOT blindly re-queue and restart tasks — that would create
 * duplicate processes and hit the concurrent execution limit, causing
 * immediate failure. Instead, recovery:
 *
 * 1. Waits for the server to be reachable (with backoff)
 * 2. Checks ALL running tasks (not just the first)
 * 3. For each task, checks if the server still has an active execution
 *    - If yes: reconnects the SSE stream to the existing execution
 *    - If no: checks requirement file to decide re-queue vs complete
 * 4. Only starts NEW executions for tasks that truly need restarting
 */
export async function recoverCLISessions(): Promise<void> {
  const store = useCLISessionStore.getState();
  const sessionsToRecover = store.getSessionsNeedingRecovery();

  if (sessionsToRecover.length === 0) {
    return;
  }

  // Wait for the server to be ready.
  const serverReady = await waitForServer();

  for (const session of sessionsToRecover) {
    store.setSessionRecovering(session.id, true);

    // Find ALL running tasks (supports parallel DAG execution)
    const runningTasks = session.queue.filter((t) => t.status.type === 'running');
    let anyReconnected = false;

    for (const task of runningTasks) {
      const retryCount = task.retryCount || 0;

      if (!serverReady) {
        // Server unreachable — re-queue if within retry limit
        if (retryCount < MAX_TASK_RETRIES) {
          store.updateTaskStatus(session.id, task.id, createQueuedStatus());
          incrementTaskRetryCount(session.id, task.id, retryCount);
        } else {
          store.updateTaskStatus(
            session.id,
            task.id,
            createFailedStatus(`Server unreachable after ${MAX_TASK_RETRIES} recovery attempts`)
          );
        }
        continue;
      }

      // Server is reachable. Check if the execution is still alive on the server.
      // This is the key difference: on hard refresh the server process keeps running,
      // so we should reconnect to it instead of starting a duplicate.
      const executionId = session.currentExecutionId;
      if (executionId) {
        const serverExec = await checkServerExecution(executionId);
        if (serverExec?.found && serverExec.status === 'running') {
          // Process is STILL RUNNING on server — reconnect the SSE stream
          const strategy = getSessionStrategy(session.id);
          if (hasCapability(strategy, 'stream')) {
            // Track the existing execution ID
            if (!sessionExecutionIds.has(session.id)) {
              sessionExecutionIds.set(session.id, new Map());
            }
            sessionExecutionIds.get(session.id)!.set(task.id, executionId);

            // Re-subscribe to the stream
            const unsubscribe = strategy.stream(executionId, (event: ExecutionEvent) => {
              store.updateLastActivity(session.id);
              if (event.type === 'result') {
                handleTaskComplete(session.id, task, true);
                cleanupTaskExecution(session.id, task.id);
              } else if (event.type === 'error') {
                handleTaskComplete(session.id, task, false);
                cleanupTaskExecution(session.id, task.id);
              }
            });

            if (!sessionUnsubscribers.has(session.id)) {
              sessionUnsubscribers.set(session.id, new Map());
            }
            sessionUnsubscribers.get(session.id)!.set(task.id, unsubscribe);

            if (serverExec.sessionId) {
              store.setClaudeSessionId(session.id, serverExec.sessionId);
            }
            store.setRunning(session.id, true);
            anyReconnected = true;
            continue; // Task stays 'running', reconnected to existing process
          }
        }

        // Execution finished while we were refreshing — check if it completed or errored
        if (serverExec?.found && (serverExec.status === 'completed')) {
          store.updateTaskStatus(session.id, task.id, createCompletedStatus());
          await performTaskCleanup(task.projectPath, task.requirementName, task.projectId);
          setTimeout(() => { store.removeTask(session.id, task.id); }, 1000);
          continue;
        }
      }

      // No active server execution found — check requirement file to decide next step
      const { exists } = await checkRequirementExists(task.projectPath, task.requirementName);

      if (exists) {
        // File exists, process is gone → task was interrupted, re-queue it
        if (retryCount < MAX_TASK_RETRIES) {
          store.updateTaskStatus(session.id, task.id, createQueuedStatus());
          incrementTaskRetryCount(session.id, task.id, retryCount);
        } else {
          store.updateTaskStatus(
            session.id,
            task.id,
            createFailedStatus(`Task interrupted ${MAX_TASK_RETRIES} times, giving up`)
          );
        }
      } else {
        // Requirement file deleted → task completed successfully
        store.updateTaskStatus(session.id, task.id, createCompletedStatus());
        setTimeout(() => { store.removeTask(session.id, task.id); }, 1000);
      }
    }

    // Resume autoStart for queued tasks (but not if we reconnected — those are already running)
    const updatedSession = useCLISessionStore.getState().sessions[session.id];
    const hasQueuedTasks = updatedSession.queue.some((t) => t.status.type === 'queued');

    if (session.autoStart && hasQueuedTasks) {
      store.setRunning(session.id, true);
      setTimeout(() => executeNextTask(session.id), 2000);
    } else if (!hasQueuedTasks && !anyReconnected) {
      store.setAutoStart(session.id, false);
      store.setRunning(session.id, false);
    }

    // Clear recovery flag
    setTimeout(() => {
      useCLISessionStore.getState().setSessionRecovering(session.id, false);
    }, 3000);
  }
}

/** Helper to increment retry count on a task in the store */
function incrementTaskRetryCount(sessionId: CLISessionId, taskId: string, currentCount: number): void {
  const currentStore = useCLISessionStore.getState();
  const currentSession = currentStore.sessions[sessionId];
  const taskInQueue = currentSession.queue.find((t) => t.id === taskId);
  if (taskInQueue) {
    taskInQueue.retryCount = currentCount + 1;
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
  const strategy = getSessionStrategy(sessionId);

  // Cancel all running executions for this session
  const execIds = sessionExecutionIds.get(sessionId);
  if (execIds) {
    for (const executionId of execIds.values()) {
      try {
        await strategy.cancel(executionId);
      } catch (error) {
        console.error('[CLI] Error aborting execution:', error);
      }
    }
  }

  // Fall back to session-level execution ID if present
  if (session.currentExecutionId && (!execIds || execIds.size === 0)) {
    try {
      await strategy.cancel(session.currentExecutionId);
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
  for (const [, strategy] of sessionStrategies) {
    strategy.cleanup();
  }
  sessionStrategies.clear();
  sessionSchedulers.clear();
}

/**
 * Get the count of active executions across all sessions
 * (useful for debugging connection limits).
 */
export function getActiveStreamCount(): number {
  let count = 0;
  for (const execMap of sessionExecutionIds.values()) {
    count += execMap.size;
  }
  return count;
}

/**
 * Get session execution status
 */
export function getSessionExecutionStatus(sessionId: CLISessionId): {
  isPolling: boolean;
  isStreaming: boolean;
  executionIds: string[];
  runningTaskCount: number;
} {
  const execMap = sessionExecutionIds.get(sessionId);
  const hasSubscription = sessionUnsubscribers.has(sessionId);
  const executionIds = execMap ? Array.from(execMap.values()) : [];

  return {
    isPolling: false, // Strategy handles polling internally
    isStreaming: hasSubscription,
    executionIds,
    runningTaskCount: executionIds.length,
  };
}

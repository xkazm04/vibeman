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
import '@/app/features/TaskRunner/lib/strategies/vscodeStrategy';
import { registerTaskComplete } from '../taskRegistry';
import { DAGScheduler, type DAGTask, type DAGTaskStatus } from '@/lib/dag/dagScheduler';

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
const sessionUnsubscribers = new Map<CLISessionId, Map<string, () => void>>();
// Track executionIds per session (multiple for parallel DAG execution)
const sessionExecutionIds = new Map<CLISessionId, Map<string, string>>();

/** Default max parallel tasks per CLI session */
const DEFAULT_MAX_PARALLEL = 3;

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

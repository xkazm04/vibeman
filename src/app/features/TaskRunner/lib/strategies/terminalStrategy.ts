/**
 * Terminal Strategy
 *
 * Executes tasks via the claude-terminal API endpoints.
 * This is the primary strategy used by CLI sessions (CLIBatchPanel / CompactTerminal).
 *
 * Flow:
 * 1. POST /api/claude-terminal/query → starts execution, returns executionId + streamUrl
 * 2. GET  /api/claude-terminal/stream?executionId=... → SSE stream for real-time events
 * 3. DELETE /api/claude-terminal/query?executionId=... → abort execution
 * 4. GET  /api/claude-terminal/query?executionId=... → poll status
 */

import type {
  ExecutionStrategy,
  ExecutionTask,
  ExecutionResult,
  ExecutionStatus,
  ExecutionEvent,
  ExecutionEventHandler,
  ExecuteOptions,
} from '../executionStrategy';
import { registerStrategy } from '../executionStrategy';

/** Max SSE reconnect attempts before falling back to polling */
const MAX_SSE_RECONNECTS = 3;

/** Base delay for SSE reconnect backoff (doubles each attempt) */
const SSE_RECONNECT_BASE_MS = 2000;

/** Max poll attempts before giving up (10s * 30 = 5 minutes) */
const MAX_POLL_ATTEMPTS = 30;

/** Log handler errors with execution context instead of silently swallowing them */
function logHandlerError(error: unknown, executionId: string, eventType: string): void {
  console.error(
    `[TerminalStrategy] Handler threw for execution=${executionId} event=${eventType}:`,
    error instanceof Error ? error.stack || error.message : error,
  );
}

interface ActiveExecution {
  executionId: string;
  eventSource?: EventSource;
  pollingInterval?: ReturnType<typeof setInterval>;
  handlers: Set<ExecutionEventHandler>;
  sseReconnectAttempts: number;
  sseReconnectTimer?: ReturnType<typeof setTimeout>;
  pollAttempts: number;
  /** Mutex: only one transport (SSE or polling) can emit completion at a time */
  completionEmitted: boolean;
  /** Set by cleanupExecution so in-flight async poll closures bail out */
  aborted: boolean;
}

class TerminalStrategy implements ExecutionStrategy {
  readonly name = 'Terminal (claude-terminal)';
  readonly capabilities = ['stream', 'status'] as const;

  private executions = new Map<string, ActiveExecution>();

  async execute(task: ExecutionTask, options?: ExecuteOptions): Promise<ExecutionResult> {
    try {
      const prompt = task.directPrompt
        || `Execute the requirement file: ${task.requirementName}`;

      // Build extra env vars for MCP bidirectional channel
      const extraEnv: Record<string, string> = {};
      if (task.projectId) extraEnv.VIBEMAN_PROJECT_ID = task.projectId;
      if (task.requirementName) extraEnv.VIBEMAN_TASK_ID = task.requirementName;

      const provider = options?.provider || undefined;
      const response = await fetch('/api/claude-terminal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: task.projectPath,
          prompt,
          resumeSessionId: options?.resumeSessionId || undefined,
          provider,
          model: options?.model || undefined,
          extraEnv: Object.keys(extraEnv).length > 0 ? extraEnv : undefined,
          useWorktree: provider === 'claude' || !provider ? true : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to start execution' }));
        return { success: false, error: err.error || `HTTP ${response.status}` };
      }

      const { executionId, streamUrl } = await response.json();

      // Track the execution
      const execution: ActiveExecution = {
        executionId,
        handlers: new Set(),
        sseReconnectAttempts: 0,
        pollAttempts: 0,
        completionEmitted: false,
        aborted: false,
      };
      this.executions.set(executionId, execution);

      // If caller wants events, start streaming immediately
      if (options?.onEvent) {
        this.stream(executionId, options.onEvent);
      }

      return { success: true, executionId, streamUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error starting terminal execution',
      };
    }
  }

  async cancel(executionId: string): Promise<boolean> {
    // Clean up local resources first
    this.cleanupExecution(executionId);

    try {
      const response = await fetch(
        `/api/claude-terminal/query?executionId=${encodeURIComponent(executionId)}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    try {
      const response = await fetch(
        `/api/claude-terminal/query?executionId=${encodeURIComponent(executionId)}`
      );

      if (!response.ok) return undefined;

      const data = await response.json();
      if (!data.success || !data.execution) return undefined;

      const exec = data.execution;
      return {
        state: exec.status === 'running' ? 'running'
          : exec.status === 'completed' ? 'completed'
          : exec.status === 'error' ? 'failed'
          : exec.status === 'aborted' ? 'failed'
          : 'pending',
        claudeSessionId: exec.sessionId,
        error: exec.status === 'error' ? 'Execution failed' : undefined,
      };
    } catch {
      return undefined;
    }
  }

  stream(executionId: string, onEvent: ExecutionEventHandler): () => void {
    let execution = this.executions.get(executionId);
    if (!execution) {
      execution = { executionId, handlers: new Set(), sseReconnectAttempts: 0, pollAttempts: 0, completionEmitted: false, aborted: false };
      this.executions.set(executionId, execution);
    }

    execution.handlers.add(onEvent);

    // Start SSE if not already connected
    if (!execution.eventSource && typeof EventSource !== 'undefined') {
      this.connectSSE(executionId);
    }

    // Return unsubscribe
    return () => {
      execution?.handlers.delete(onEvent);
      if (execution?.handlers.size === 0) {
        this.cleanupExecution(executionId);
      }
    };
  }

  private connectSSE(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution || execution.eventSource) return;

    const streamUrl = `/api/claude-terminal/stream?executionId=${encodeURIComponent(executionId)}`;
    const es = new EventSource(streamUrl);
    execution.eventSource = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const execEvent: ExecutionEvent = {
          type: data.type || 'message',
          data,
          timestamp: data.timestamp || Date.now(),
        };

        // Reset reconnect counter on successful message
        execution!.sseReconnectAttempts = 0;

        // Notify all handlers
        for (const handler of execution!.handlers) {
          try { handler(execEvent); } catch (err) { logHandlerError(err, executionId, execEvent.type); }
        }

        // On terminal events, guard against double-completion from SSE+polling race
        if (data.type === 'result' || data.type === 'error') {
          if (execution!.completionEmitted) return;
          execution!.completionEmitted = true;
          es.close();
          execution!.eventSource = undefined;
        }
      } catch (err) {
        console.error(`[TerminalStrategy] Failed to parse SSE message for execution=${executionId}:`, err);
      }
    };

    es.onerror = () => {
      es.close();
      execution!.eventSource = undefined;

      // Try SSE reconnect with backoff before falling back to polling.
      // This handles brief server restarts (HMR, self-editing) gracefully.
      if (execution!.sseReconnectAttempts < MAX_SSE_RECONNECTS) {
        const delay = SSE_RECONNECT_BASE_MS * Math.pow(2, execution!.sseReconnectAttempts);
        execution!.sseReconnectAttempts++;
        execution!.sseReconnectTimer = setTimeout(() => {
          execution!.sseReconnectTimer = undefined;
          // Only reconnect if we still have handlers (not cleaned up)
          if (execution!.handlers.size > 0) {
            this.connectSSE(executionId);
          }
        }, delay);
      } else {
        // SSE reconnects exhausted — fall back to polling
        this.startPollingFallback(executionId);
      }
    };
  }

  cleanup(): void {
    for (const executionId of this.executions.keys()) {
      this.cleanupExecution(executionId);
    }
    this.executions.clear();
  }

  // ---- Private helpers ----

  private cleanupExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    // Mark aborted first so any in-flight async poll closure bails out
    execution.aborted = true;

    if (execution.eventSource) {
      execution.eventSource.close();
      execution.eventSource = undefined;
    }
    if (execution.sseReconnectTimer) {
      clearTimeout(execution.sseReconnectTimer);
      execution.sseReconnectTimer = undefined;
    }
    if (execution.pollingInterval) {
      clearInterval(execution.pollingInterval);
      execution.pollingInterval = undefined;
    }
    execution.handlers.clear();
    this.executions.delete(executionId);
  }

  private startPollingFallback(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution || execution.pollingInterval) return;

    let isPolling = false;
    execution.pollingInterval = setInterval(async () => {
      // Bail out if execution was cleaned up while an async poll was in-flight
      if (execution.aborted || isPolling) return;
      isPolling = true;
      try {
        const status = await this.getStatus(executionId);

        // Re-check after await — execution may have been cleaned up during the fetch
        if (execution.aborted) return;

        // If server is unreachable, increment poll attempts
        if (!status) {
          execution.pollAttempts++;
          if (execution.pollAttempts >= MAX_POLL_ATTEMPTS) {
            // Exhausted poll attempts — emit error so task gets re-queued on recovery
            const errorEvent: ExecutionEvent = {
              type: 'error',
              data: { error: 'Server unreachable after polling timeout' },
              timestamp: Date.now(),
            };
            for (const handler of execution.handlers) {
              try { handler(errorEvent); } catch (err) { logHandlerError(err, executionId, 'error'); }
            }
            this.cleanupExecution(executionId);
          }
          return;
        }

        // Server responded — reset poll counter
        execution.pollAttempts = 0;

        const event: ExecutionEvent = {
          type: 'status',
          data: status,
          timestamp: Date.now(),
        };
        for (const handler of execution.handlers) {
          try { handler(event); } catch (err) { logHandlerError(err, executionId, 'status'); }
        }

        if (status.state === 'completed' || status.state === 'failed') {
          // Guard against double-completion from SSE+polling race
          if (execution.completionEmitted) {
            this.cleanupExecution(executionId);
            return;
          }
          execution.completionEmitted = true;
          const resultEvent: ExecutionEvent = {
            type: status.state === 'completed' ? 'result' : 'error',
            data: status,
            timestamp: Date.now(),
          };
          for (const handler of execution.handlers) {
            try { handler(resultEvent); } catch (err) { logHandlerError(err, executionId, resultEvent.type); }
          }
          this.cleanupExecution(executionId);
        }
      } catch {
        if (execution.aborted) return;
        execution.pollAttempts++;
        if (execution.pollAttempts >= MAX_POLL_ATTEMPTS) {
          const errorEvent: ExecutionEvent = {
            type: 'error',
            data: { error: 'Polling failed after max attempts' },
            timestamp: Date.now(),
          };
          for (const handler of execution.handlers) {
            try { handler(errorEvent); } catch (err) { logHandlerError(err, executionId, 'error'); }
          }
          this.cleanupExecution(executionId);
        }
      }
      finally { isPolling = false; }
    }, 10_000);
  }
}

// Register on import
registerStrategy('terminal', () => new TerminalStrategy());

export { TerminalStrategy };

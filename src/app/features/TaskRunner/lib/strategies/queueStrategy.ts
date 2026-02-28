/**
 * Queue Strategy
 *
 * Executes tasks via the claude-code execution queue (server-side).
 * This is the async execution path that queues work on the server.
 *
 * Flow:
 * 1. POST /api/claude-code/execute (async mode) → queues task, returns taskId
 * 2. GET  /api/claude-code/tasks/:id/stream → SSE stream for real-time events
 * 3. GET  /api/claude-code/tasks/:id → poll status
 *
 * Note: cancellation is not directly supported by the execution queue.
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

interface ActiveExecution {
  taskId: string;
  eventSource?: EventSource;
  pollingInterval?: ReturnType<typeof setInterval>;
  handlers: Set<ExecutionEventHandler>;
}

class QueueStrategy implements ExecutionStrategy {
  readonly name = 'Queue (claude-code)';
  readonly capabilities = ['stream', 'status'] as const;

  private executions = new Map<string, ActiveExecution>();

  async execute(task: ExecutionTask, options?: ExecuteOptions): Promise<ExecutionResult> {
    try {
      const body: Record<string, unknown> = {
        projectPath: task.projectPath,
        requirementName: task.requirementName,
        projectId: task.projectId,
        async: true,
      };

      if (options?.gitConfig) {
        body.gitConfig = options.gitConfig;
      }

      if (options?.resumeSessionId) {
        body.sessionConfig = { claudeSessionId: options.resumeSessionId };
      }

      const response = await fetch('/api/claude-code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to queue task' }));
        return { success: false, error: err.error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const taskId = data.taskId;

      // Track the execution
      const execution: ActiveExecution = {
        taskId,
        handlers: new Set(),
      };
      this.executions.set(taskId, execution);

      // If caller wants events, start streaming immediately
      if (options?.onEvent) {
        this.stream(taskId, options.onEvent);
      }

      return {
        success: true,
        executionId: taskId,
        streamUrl: `/api/claude-code/tasks/${encodeURIComponent(taskId)}/stream`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error queuing task',
      };
    }
  }

  async cancel(_executionId: string): Promise<boolean> {
    // The execution queue doesn't expose a direct cancel mechanism.
    // Clean up local tracking resources.
    this.cleanupExecution(_executionId);
    return false;
  }

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    try {
      const response = await fetch(
        `/api/claude-code/tasks/${encodeURIComponent(executionId)}`
      );

      if (!response.ok) return undefined;

      const data = await response.json();
      const task = data.task;
      if (!task) return undefined;

      const stateMap: Record<string, ExecutionStatus['state']> = {
        pending: 'pending',
        running: 'running',
        completed: 'completed',
        failed: 'failed',
        'session-limit': 'failed',
      };

      return {
        state: stateMap[task.status] || 'pending',
        claudeSessionId: task.capturedClaudeSessionId,
        error: task.error,
      };
    } catch {
      return undefined;
    }
  }

  stream(executionId: string, onEvent: ExecutionEventHandler): () => void {
    let execution = this.executions.get(executionId);
    if (!execution) {
      execution = { taskId: executionId, handlers: new Set() };
      this.executions.set(executionId, execution);
    }

    execution.handlers.add(onEvent);

    // Start SSE if not already connected
    if (!execution.eventSource && typeof EventSource !== 'undefined') {
      const streamUrl = `/api/claude-code/tasks/${encodeURIComponent(executionId)}/stream`;
      const es = new EventSource(streamUrl);
      execution.eventSource = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const execEvent: ExecutionEvent = {
            type: data.type === 'change' ? 'status'
              : data.type === 'final' ? 'result'
              : data.type === 'done' ? 'result'
              : data.type === 'heartbeat' ? 'heartbeat'
              : 'status',
            data,
            timestamp: Date.now(),
          };

          for (const handler of execution!.handlers) {
            try { handler(execEvent); } catch { /* handler error */ }
          }

          // Terminal events
          if (data.type === 'done' || data.type === 'final') {
            es.close();
            execution!.eventSource = undefined;
          }
        } catch { /* parse error */ }
      };

      es.onerror = () => {
        es.close();
        execution!.eventSource = undefined;
        // Start polling fallback
        this.startPollingFallback(executionId);
      };
    }

    return () => {
      execution?.handlers.delete(onEvent);
      if (execution?.handlers.size === 0) {
        this.cleanupExecution(executionId);
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

    if (execution.eventSource) {
      execution.eventSource.close();
      execution.eventSource = undefined;
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
      if (isPolling) return;
      isPolling = true;
      try {
        const status = await this.getStatus(executionId);
        if (!status) return;

        const event: ExecutionEvent = {
          type: 'status',
          data: status,
          timestamp: Date.now(),
        };
        for (const handler of execution.handlers) {
          try { handler(event); } catch { /* handler error */ }
        }

        if (status.state === 'completed' || status.state === 'failed') {
          const resultEvent: ExecutionEvent = {
            type: status.state === 'completed' ? 'result' : 'error',
            data: status,
            timestamp: Date.now(),
          };
          for (const handler of execution.handlers) {
            try { handler(resultEvent); } catch { /* handler error */ }
          }
          this.cleanupExecution(executionId);
        }
      } catch { /* poll error */ }
      finally { isPolling = false; }
    }, 30_000); // 30s fallback polling (matches pollingManager's SSE fallback)
  }
}

// Register on import
registerStrategy('queue', () => new QueueStrategy());

export { QueueStrategy };

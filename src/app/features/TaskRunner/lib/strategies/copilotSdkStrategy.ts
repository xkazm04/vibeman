/**
 * Copilot SDK Strategy
 *
 * Executes tasks via the Copilot SDK API routes.
 * Replaces the old VS Code bridge strategy with direct SDK integration.
 *
 * Flow:
 * 1. POST /api/copilot-sdk/execute → starts execution, returns executionId + streamUrl
 * 2. GET  /api/copilot-sdk/stream?executionId=... → SSE stream for real-time events
 * 3. DELETE /api/copilot-sdk/execute?executionId=... → abort execution
 * 4. GET  /api/copilot-sdk/execute?executionId=... → poll status
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
  executionId: string;
  eventSource?: EventSource;
  pollingInterval?: ReturnType<typeof setInterval>;
  handlers: Set<ExecutionEventHandler>;
}

class CopilotSdkStrategy implements ExecutionStrategy {
  readonly name = 'Copilot SDK';
  readonly capabilities = ['stream', 'status'] as const;

  private executions = new Map<string, ActiveExecution>();

  async execute(task: ExecutionTask, options?: ExecuteOptions): Promise<ExecutionResult> {
    try {
      const prompt = task.directPrompt
        || `Execute the requirement file: ${task.requirementName}`;

      const response = await fetch('/api/copilot-sdk/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: task.projectPath,
          prompt,
          model: options?.model || undefined,
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
        error: error instanceof Error ? error.message : 'Unknown error starting Copilot SDK execution',
      };
    }
  }

  async cancel(executionId: string): Promise<boolean> {
    this.cleanupExecution(executionId);

    try {
      const response = await fetch(
        `/api/copilot-sdk/execute?executionId=${encodeURIComponent(executionId)}`,
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
        `/api/copilot-sdk/execute?executionId=${encodeURIComponent(executionId)}`
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
      execution = { executionId, handlers: new Set() };
      this.executions.set(executionId, execution);
    }

    execution.handlers.add(onEvent);

    // Start SSE if not already connected
    if (!execution.eventSource && typeof EventSource !== 'undefined') {
      const streamUrl = `/api/copilot-sdk/stream?executionId=${encodeURIComponent(executionId)}`;
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

          for (const handler of execution!.handlers) {
            try { handler(execEvent); } catch { /* handler error */ }
          }

          // On terminal events, clean up stream
          if (data.type === 'result' || data.type === 'error') {
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
    }, 10_000);
  }
}

// Register on import
registerStrategy('copilot', () => new CopilotSdkStrategy());

export { CopilotSdkStrategy };

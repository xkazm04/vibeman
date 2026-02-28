/**
 * VS Code Strategy
 *
 * Executes tasks via the vibeman-bridge VS Code extension.
 * The extension runs a local HTTP server on localhost:9876 that uses
 * Copilot-provided language models via the vscode.lm API.
 *
 * Flow:
 * 1. POST http://localhost:9876/execute-task → starts execution, returns executionId + streamUrl
 * 2. GET  http://localhost:9876/stream?executionId=... → SSE stream for real-time events
 * 3. DELETE http://localhost:9876/execute-task?executionId=... → abort execution
 * 4. GET  http://localhost:9876/health → check extension availability
 *
 * Key differences from TerminalStrategy:
 * - Talks directly to extension HTTP server (cross-origin with CORS)
 * - No session resume support (no --resume equivalent)
 * - No cli-service involvement (extension handles everything)
 * - Model parameter maps to Copilot model IDs (gpt-4o, gpt-4.1, claude-sonnet-4)
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

const VSCODE_BRIDGE_URL = 'http://localhost:9876';

interface ActiveExecution {
  executionId: string;
  eventSource?: EventSource;
  handlers: Set<ExecutionEventHandler>;
}

class VSCodeStrategy implements ExecutionStrategy {
  readonly name = 'VS Code (Copilot)';
  readonly capabilities = ['stream', 'status'] as const;

  private executions = new Map<string, ActiveExecution>();

  async execute(task: ExecutionTask, options?: ExecuteOptions): Promise<ExecutionResult> {
    try {
      // Check extension health first
      const healthy = await this.checkHealth();
      if (!healthy) {
        return {
          success: false,
          error: 'VS Code extension (vibeman-bridge) is not running. Open VS Code and ensure the extension is installed.',
        };
      }

      const prompt = task.directPrompt
        || `Execute the requirement file: ${task.requirementName}`;

      const response = await fetch(`${VSCODE_BRIDGE_URL}/execute-task`, {
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

      if (options?.onEvent) {
        this.stream(executionId, options.onEvent);
      }

      return { success: true, executionId, streamUrl };
    } catch (error) {
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed'))) {
        return {
          success: false,
          error: 'Cannot reach VS Code extension (vibeman-bridge). Make sure VS Code is open and the extension is running.',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error starting VS Code execution',
      };
    }
  }

  async cancel(executionId: string): Promise<boolean> {
    this.cleanupExecution(executionId);

    try {
      const response = await fetch(
        `${VSCODE_BRIDGE_URL}/execute-task?executionId=${encodeURIComponent(executionId)}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    // Extension doesn't have a dedicated status endpoint.
    // Status is communicated via the SSE stream events.
    const execution = this.executions.get(executionId);
    if (execution) {
      return { state: 'running' };
    }
    return undefined;
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
      const streamUrl = `${VSCODE_BRIDGE_URL}/stream?executionId=${encodeURIComponent(executionId)}`;
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
        // No polling fallback — extension is either running or not
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
    execution.handlers.clear();
    this.executions.delete(executionId);
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${VSCODE_BRIDGE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.running === true;
    } catch {
      return false;
    }
  }
}

// Register on import
registerStrategy('vscode', () => new VSCodeStrategy());

export { VSCodeStrategy };

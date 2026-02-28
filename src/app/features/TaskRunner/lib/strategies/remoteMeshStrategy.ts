/**
 * Remote Mesh Strategy
 *
 * Executes tasks on a remote device via the mesh command protocol.
 * Commands are dispatched through /api/remote/mesh/commands and status is polled.
 *
 * Flow:
 * 1. POST /api/remote/mesh/commands (start_remote_batch) → dispatches to remote
 * 2. POST /api/remote/mesh/commands (get_batch_status) → polls status
 *
 * This strategy operates at the batch level (multiple tasks = one batch),
 * but implements the single-task ExecutionStrategy interface by wrapping
 * each task in a single-item batch.
 *
 * Note: Real-time streaming is not supported — status is polled periodically.
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

interface RemoteMeshConfig {
  localDeviceId: string;
  localDeviceName: string;
  targetDeviceId: string;
}

interface ActiveExecution {
  batchId: string;
  taskId: string;
  config: RemoteMeshConfig;
  pollingInterval?: ReturnType<typeof setInterval>;
  handlers: Set<ExecutionEventHandler>;
}

/**
 * Poll for a mesh command result with timeout.
 */
async function pollForCommandResult(commandId: string, timeoutMs: number): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`/api/remote/mesh/commands?command_id=${commandId}`);
    if (!response.ok) throw new Error('Failed to check command status');

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch command');

    const command = data.commands?.find((c: any) => c.id === commandId);
    if (command) {
      if (command.status === 'completed') return command.result || { success: true };
      if (command.status === 'failed') throw new Error(command.error || 'Command failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Command timed out');
}

class RemoteMeshStrategy implements ExecutionStrategy {
  readonly name = 'Remote Mesh';
  readonly capabilities = ['status'] as const;

  private config: RemoteMeshConfig | null = null;
  private executions = new Map<string, ActiveExecution>();

  /**
   * Configure the mesh connection. Must be called before execute().
   */
  configure(config: RemoteMeshConfig): void {
    this.config = config;
  }

  async execute(task: ExecutionTask, _options?: ExecuteOptions): Promise<ExecutionResult> {
    if (!this.config) {
      return { success: false, error: 'Remote mesh not configured. Call configure() first.' };
    }

    try {
      // Dispatch a single-task batch to the remote device
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'start_remote_batch',
          target_device_id: this.config.targetDeviceId,
          source_device_id: this.config.localDeviceId,
          source_device_name: this.config.localDeviceName,
          payload: {
            requirement_ids: [task.requirementName],
          },
        }),
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to dispatch remote execution' };
      }

      const data = await response.json();
      if (!data.success) {
        return { success: false, error: data.error || 'Command dispatch failed' };
      }

      // Wait for the batch to be accepted (20s timeout)
      const result = await pollForCommandResult(data.command_id, 20_000);

      if (!result.batch_id) {
        return { success: false, error: 'Remote device did not return a batch ID' };
      }

      const batchId = result.batch_id;

      // Track the execution
      const execution: ActiveExecution = {
        batchId,
        taskId: task.id,
        config: this.config,
        handlers: new Set(),
      };
      this.executions.set(batchId, execution);

      // Start status polling automatically
      this.startStatusPolling(batchId);

      return {
        success: true,
        executionId: batchId,
        claudeSessionId: result.session_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown remote mesh error',
      };
    }
  }

  async cancel(executionId: string): Promise<boolean> {
    // Remote mesh doesn't support direct cancellation
    this.cleanupExecution(executionId);
    return false;
  }

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    const execution = this.executions.get(executionId);
    const config = execution?.config || this.config;
    if (!config) return undefined;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'get_batch_status',
          target_device_id: config.targetDeviceId,
          source_device_id: config.localDeviceId,
          source_device_name: config.localDeviceName,
          payload: {
            batch_ids: [executionId],
          },
        }),
      });

      if (!response.ok) return undefined;

      const data = await response.json();
      if (!data.success) return undefined;

      const result = await pollForCommandResult(data.command_id, 10_000);
      const batch = result.batches?.[0];
      if (!batch) return undefined;

      const stateMap: Record<string, ExecutionStatus['state']> = {
        pending: 'pending',
        running: 'running',
        completed: 'completed',
        failed: 'failed',
      };

      const totalTasks = batch.total_tasks || 1;
      const completedTasks = batch.completed_tasks || 0;

      return {
        state: stateMap[batch.status] || 'running',
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : undefined,
        error: batch.status === 'failed' ? 'Remote batch failed' : undefined,
      };
    } catch {
      return undefined;
    }
  }

  stream(executionId: string, onEvent: ExecutionEventHandler): () => void {
    // Remote mesh doesn't support real-time streaming.
    // Events are delivered via polling in startStatusPolling().
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.handlers.add(onEvent);
      return () => {
        execution.handlers.delete(onEvent);
      };
    }

    // If no execution tracked, return no-op
    return () => {};
  }

  cleanup(): void {
    for (const executionId of this.executions.keys()) {
      this.cleanupExecution(executionId);
    }
    this.executions.clear();
    this.config = null;
  }

  // ---- Private helpers ----

  private cleanupExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    if (execution.pollingInterval) {
      clearInterval(execution.pollingInterval);
      execution.pollingInterval = undefined;
    }
    execution.handlers.clear();
    this.executions.delete(executionId);
  }

  private startStatusPolling(executionId: string): void {
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
    }, 10_000); // 10s interval matching the original useRemoteTaskRunner
  }
}

// Register on import
registerStrategy('remote-mesh', () => new RemoteMeshStrategy());

export { RemoteMeshStrategy };

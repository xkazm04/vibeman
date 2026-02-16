/**
 * Persona Execution Queue
 *
 * Singleton queue managing concurrent executions per persona.
 * Respects max_concurrent setting per persona.
 * Pattern from claudeExecutionQueue.ts.
 */

import type { DbPersona, DbPersonaToolDefinition } from '@/app/db/models/persona.types';
import { personaExecutionRepository } from '@/app/db/repositories/persona.repository';
import { executePersona, cancelExecution as cancelProcess, cleanupExecution } from './executionEngine';

interface QueuedExecution {
  executionId: string;
  persona: DbPersona;
  tools: DbPersonaToolDefinition[];
  inputData?: object;
  lastExecution?: { completed_at: string; duration_ms: number | null; status: string } | null;
  triggerContext?: { trigger_type: string; interval_seconds: number | null } | null;
  resolve: (result: { success: boolean; error?: string }) => void;
}

class PersonaExecutionQueue {
  private queue: QueuedExecution[] = [];
  private running = new Map<string, Set<string>>(); // personaId -> Set<executionId>
  private processing = false;

  /**
   * Enqueue a persona execution. Returns a promise that resolves when execution completes.
   */
  async enqueue(
    executionId: string,
    persona: DbPersona,
    tools: DbPersonaToolDefinition[],
    inputData?: object,
    lastExecution?: { completed_at: string; duration_ms: number | null; status: string } | null,
    triggerContext?: { trigger_type: string; interval_seconds: number | null } | null,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.queue.push({ executionId, persona, tools, inputData, lastExecution, triggerContext, resolve });
      this.processNext();
    });
  }

  /**
   * Cancel a running or queued execution.
   */
  cancel(executionId: string): boolean {
    // Check if it's in the queue (not yet started)
    const queueIndex = this.queue.findIndex(q => q.executionId === executionId);
    if (queueIndex >= 0) {
      const item = this.queue.splice(queueIndex, 1)[0];
      item.resolve({ success: false, error: 'Cancelled before execution started' });
      return true;
    }

    // Try to cancel the running process
    return cancelProcess(executionId);
  }

  /**
   * Get all currently running execution IDs.
   */
  getRunning(): string[] {
    const ids: string[] = [];
    for (const set of this.running.values()) {
      for (const id of set) ids.push(id);
    }
    return ids;
  }

  /**
   * Get queue length.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Process the next queued execution if capacity allows.
   */
  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        // Find the first queued item whose persona has capacity
        const index = this.queue.findIndex((item) => {
          const runningCount = this.running.get(item.persona.id)?.size ?? 0;
          return runningCount < item.persona.max_concurrent;
        });

        if (index < 0) break; // No items with capacity

        const item = this.queue.splice(index, 1)[0];

        // Track running execution
        if (!this.running.has(item.persona.id)) {
          this.running.set(item.persona.id, new Set());
        }
        this.running.get(item.persona.id)!.add(item.executionId);

        // Execute (don't await - run concurrently)
        this.runExecution(item);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Run a single execution and handle completion.
   */
  private async runExecution(item: QueuedExecution): Promise<void> {
    try {
      // Update DB status to running
      personaExecutionRepository.updateStatus(item.executionId, 'running', {
        started_at: new Date().toISOString(),
      });

      const result = await executePersona({
        executionId: item.executionId,
        persona: item.persona,
        tools: item.tools,
        inputData: item.inputData,
        lastExecution: item.lastExecution,
        triggerContext: item.triggerContext,
      });

      // Update DB with result
      if (result.success) {
        personaExecutionRepository.updateStatus(item.executionId, 'completed', {
          output_data: result.output ? { raw: result.output } : undefined,
          claude_session_id: result.claudeSessionId,
          log_file_path: result.logFilePath,
          duration_ms: result.durationMs,
          completed_at: new Date().toISOString(),
          execution_flows: result.executionFlows,
          model_used: result.modelUsed,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_usd: result.costUsd,
        });
      } else {
        personaExecutionRepository.updateStatus(
          item.executionId,
          result.sessionLimitReached ? 'failed' : 'failed',
          {
            error_message: result.error,
            log_file_path: result.logFilePath,
            duration_ms: result.durationMs,
            completed_at: new Date().toISOString(),
          }
        );
      }

      item.resolve({ success: result.success, error: result.error });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      personaExecutionRepository.updateStatus(item.executionId, 'failed', {
        error_message: msg,
        completed_at: new Date().toISOString(),
      });
      item.resolve({ success: false, error: msg });
    } finally {
      // Remove from running set
      const runningSet = this.running.get(item.persona.id);
      if (runningSet) {
        runningSet.delete(item.executionId);
        if (runningSet.size === 0) this.running.delete(item.persona.id);
      }

      // Schedule cleanup of buffers after a delay (allow SSE clients to finish)
      setTimeout(() => cleanupExecution(item.executionId), 5 * 60 * 1000);

      // Process next in queue
      this.processNext();
    }
  }
}

/** Singleton instance */
export const personaExecutionQueue = new PersonaExecutionQueue();

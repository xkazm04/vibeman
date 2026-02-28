/**
 * Execution Manager
 *
 * Tracks active executions, manages SSE listeners, and handles cancellation.
 * Each execution runs the agent loop asynchronously and emits events to subscribers.
 */

import * as vscode from 'vscode';
import { runAgentLoop } from './agentLoop';
import type { ActiveExecution, BridgeEvent } from './types';

export class ExecutionManager {
  private executions = new Map<string, ActiveExecution>();

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      return models.map(m => `${m.id} (${m.family})`);
    } catch {
      return [];
    }
  }

  startExecution(projectPath: string, prompt: string, modelId?: string): string {
    const executionId = generateId();

    const execution: ActiveExecution = {
      id: executionId,
      projectPath,
      prompt,
      model: modelId || '',
      cancelled: false,
      listeners: new Set(),
      cancelToken: { cancelled: false },
    };

    this.executions.set(executionId, execution);

    // Emit connected event immediately
    this.emit(executionId, {
      type: 'connected',
      data: { executionId },
      timestamp: Date.now(),
    });

    // Start the agent loop asynchronously
    this.runLoop(execution).catch((err) => {
      this.emit(executionId, {
        type: 'error',
        data: { error: err?.message || 'Agent loop failed unexpectedly' },
        timestamp: Date.now(),
      });
    });

    return executionId;
  }

  cancel(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;
    execution.cancelled = true;
    execution.cancelToken.cancelled = true;
    return true;
  }

  cancelAll(): void {
    for (const execution of this.executions.values()) {
      execution.cancelled = true;
      execution.cancelToken.cancelled = true;
    }
  }

  subscribe(executionId: string, listener: (event: BridgeEvent) => void): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;
    execution.listeners.add(listener);
    return true;
  }

  unsubscribe(executionId: string, listener: (event: BridgeEvent) => void): void {
    this.executions.get(executionId)?.listeners.delete(listener);
  }

  private emit(executionId: string, event: BridgeEvent): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    for (const listener of execution.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors (e.g. closed SSE connection)
      }
    }
  }

  private async runLoop(execution: ActiveExecution): Promise<void> {
    try {
      await runAgentLoop({
        executionId: execution.id,
        projectPath: execution.projectPath,
        prompt: execution.prompt,
        modelId: execution.model,
        cancelToken: execution.cancelToken,
        emit: (event) => this.emit(execution.id, event),
      });
    } finally {
      // Cleanup after a delay to allow SSE clients to read final events
      setTimeout(() => {
        this.executions.delete(execution.id);
      }, 30_000);
    }
  }
}

function generateId(): string {
  // crypto.randomUUID() is available in Node 19+ / modern VS Code
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

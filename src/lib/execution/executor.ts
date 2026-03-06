/**
 * Unified Execution Orchestrator
 *
 * Core abstraction that manages task execution across multiple backends:
 * - CLI local execution
 * - Conductor pipeline orchestration
 * - Claude Code async queue
 * - Background scan queue
 * - Remote mesh distributed execution
 *
 * Single interface for all execution flows with automatic backend routing.
 */

import type {
  UnifiedExecutor,
  ExecutionTask,
  ExecutionConfig,
  ExecutionStatus,
  ExecutionBackendProvider,
  ExecutionStorage,
  ExecutionProgress,
} from './types';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Storage (temporary; can be replaced with DB storage)
// ─────────────────────────────────────────────────────────────────────────────

class InMemoryExecutionStorage implements ExecutionStorage {
  private tasks = new Map<string, ExecutionTask>();
  private maxSize = 1000;

  async save<T>(task: ExecutionTask<T>): Promise<void> {
    this.tasks.set(task.id, task as ExecutionTask);
    
    // Trim old entries if exceeding max size
    if (this.tasks.size > this.maxSize) {
      const entries = Array.from(this.tasks.entries());
      const sorted = entries.sort((a, b) => b[1].lastUpdate - a[1].lastUpdate);
      const toDelete = sorted.slice(this.maxSize).map(([id]) => id);
      toDelete.forEach(id => this.tasks.delete(id));
    }
  }

  async load<T>(executionId: string): Promise<ExecutionTask<T> | null> {
    const task = this.tasks.get(executionId);
    return task ? (task as ExecutionTask<T>) : null;
  }

  async list(options?: {
    backend?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<ExecutionTask[]> {
    let results = Array.from(this.tasks.values());
    
    if (options?.backend) {
      results = results.filter(t => t.backend === options.backend);
    }
    if (options?.status) {
      results = results.filter(t => t.status === options.status);
    }
    
    // Sort by most recent first
    results.sort((a, b) => b.lastUpdate - a.lastUpdate);
    
    const limit = options?.limit || 100;
    return results.slice(0, limit);
  }

  async delete(executionIds: string[]): Promise<number> {
    let count = 0;
    for (const id of executionIds) {
      if (this.tasks.has(id)) {
        this.tasks.delete(id);
        count++;
      }
    }
    return count;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Subscribers (for real-time updates)
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressSubscriber {
  callbackId: string;
  callback: (progress: ExecutionProgress) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Executor Implementation
// ─────────────────────────────────────────────────────────────────────────────

class DefaultUnifiedExecutor implements UnifiedExecutor {
  private backends: Map<string, ExecutionBackendProvider> = new Map();
  private storage: ExecutionStorage;
  private progressSubscribers = new Map<string, ProgressSubscriber[]>();

  constructor(storage?: ExecutionStorage) {
    this.storage = storage || new InMemoryExecutionStorage();
  }

  /**
   * Register a backend provider (e.g., Conductor, CLI, Claude, etc).
   */
  registerBackend(provider: ExecutionBackendProvider): void {
    this.backends.set(provider.backend, provider);
  }

  /**
   * Submit a task for execution.
   */
  async submit<T = unknown>(config: ExecutionConfig<T>): Promise<string> {
    const executionId = uuidv4();
    const now = Date.now();

    // Find a backend capable of handling this task
    const backend = this.findBackend(config);
    if (!backend) {
      throw new Error(
        `No execution backend available for task type: ${config.taskType}`
      );
    }

    // Create task record
    const task: ExecutionTask<T> = {
      id: executionId,
      backend: backend.backend,
      taskType: config.taskType,
      status: 'pending',
      createdAt: now,
      lastUpdate: now,
      progress: {},
      projectId: config.projectId,
      sourceId: config.sourceId,
      tags: config.tags,
      timeout: config.timeout,
    };

    // Save initial state
    await this.storage.save(task);

    try {
      // Submit to backend
      // Note: Backend's submit() may also save updates to storage
      await backend.submit<T>(config);
    } catch (error) {
      // Mark as failed if submission fails
      task.status = 'failed';
      task.error = {
        code: 'submission_failed',
        message: error instanceof Error ? error.message : String(error),
      };
      task.completedAt = Date.now();
      task.lastUpdate = Date.now();
      await this.storage.save(task);
      throw error;
    }

    return executionId;
  }

  /**
   * Wait for a task to complete (with optional timeout).
   */
  async waitFor<T = unknown>(
    executionId: string,
    timeout?: number
  ): Promise<ExecutionTask<T>> {
    const startTime = Date.now();
    const pollInterval = 100; // ms

    while (true) {
      const task = await this.storage.load<T>(executionId);
      if (!task) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      // Check if completed
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        return task;
      }

      // Check timeout
      if (timeout && Date.now() - startTime > timeout) {
        task.status = 'timeout';
        task.completedAt = Date.now();
        task.lastUpdate = Date.now();
        await this.storage.save(task);
        return task;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Get current status of a running task.
   */
  async getStatus<T = unknown>(executionId: string): Promise<ExecutionTask<T> | null> {
    return this.storage.load<T>(executionId);
  }

  /**
   * Cancel a running task.
   */
  async cancel(executionId: string): Promise<void> {
    const task = await this.storage.load(executionId);
    if (!task) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (task.status === 'running') {
      // Find backend and request cancellation
      const backend = this.backends.get(task.backend);
      if (backend) {
        try {
          await backend.cancel(executionId);
        } catch (error) {
          console.warn(`Failed to cancel via ${task.backend} backend:`, error);
        }
      }
    }

    task.status = 'cancelled';
    task.completedAt = Date.now();
    task.lastUpdate = Date.now();
    await this.storage.save(task);

    // Notify subscribers
    this.notifyProgress(executionId, { message: 'Execution cancelled' });
  }

  /**
   * Subscribe to progress updates.
   */
  onProgress(
    executionId: string,
    callback: (progress: ExecutionProgress) => void
  ): () => void {
    const callbackId = uuidv4();
    const subscriber: ProgressSubscriber = { callbackId, callback };

    if (!this.progressSubscribers.has(executionId)) {
      this.progressSubscribers.set(executionId, []);
    }
    this.progressSubscribers.get(executionId)!.push(subscriber);

    // Return unsubscribe function
    return () => {
      const subs = this.progressSubscribers.get(executionId);
      if (subs) {
        const idx = subs.findIndex(s => s.callbackId === callbackId);
        if (idx !== -1) {
          subs.splice(idx, 1);
        }
      }
    };
  }

  /**
   * List recent executions (for monitoring).
   */
  async listRecent(options?: {
    backend?: string;
    limit?: number;
    status?: ExecutionStatus;
  }): Promise<ExecutionTask[]> {
    return this.storage.list({
      backend: options?.backend as any,
      status: options?.status,
      limit: options?.limit,
    });
  }

  /**
   * Cleanup old execution records.
   */
  async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const recent = await this.storage.list({ limit: 10000 });
    const toDelete = recent
      .filter(t => t.lastUpdate < cutoff)
      .map(t => t.id);
    return this.storage.delete(toDelete);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Find a backend capable of handling this task type.
   */
  private findBackend(
    config: ExecutionConfig
  ): ExecutionBackendProvider | null {
    // If backend preference specified, try it first
    if (config.backend) {
      const pref = this.backends.get(config.backend);
      if (pref?.canHandle(config.taskType, config.backend)) {
        return pref;
      }
    }

    // Otherwise, find first backend that can handle it
    for (const backend of this.backends.values()) {
      if (backend.canHandle(config.taskType)) {
        return backend;
      }
    }

    return null;
  }

  /**
   * Notify progress subscribers.
   */
  protected notifyProgress(executionId: string, progress: ExecutionProgress): void {
    const subs = this.progressSubscribers.get(executionId);
    if (subs) {
      for (const sub of subs) {
        try {
          sub.callback(progress);
        } catch (error) {
          console.error('Progress callback error:', error);
        }
      }
    }
  }

  /**
   * Update task status in storage and notify subscribers.
   */
  protected async updateTask<T = unknown>(
    executionId: string,
    updates: Partial<ExecutionTask<T>>,
    progress?: ExecutionProgress
  ): Promise<void> {
    const task = await this.storage.load<T>(executionId);
    if (task) {
      Object.assign(task, updates, { lastUpdate: Date.now() });
      await this.storage.save(task);
      if (progress) {
        this.notifyProgress(executionId, progress);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let executorInstance: UnifiedExecutor | null = null;

/**
 * Get the global unified executor instance.
 */
export function getUnifiedExecutor(): UnifiedExecutor {
  if (!executorInstance) {
    executorInstance = new DefaultUnifiedExecutor();
  }
  return executorInstance;
}

/**
 * Initialize the executor with custom storage (for testing/advanced usage).
 */
export function initializeExecutor(storage: ExecutionStorage): UnifiedExecutor {
  executorInstance = new DefaultUnifiedExecutor(storage);
  return executorInstance;
}

/**
 * Register a backend provider globally.
 */
export function registerExecutionBackend(provider: ExecutionBackendProvider): void {
  const executor = getUnifiedExecutor();
  if (executor instanceof DefaultUnifiedExecutor) {
    executor.registerBackend(provider);
  }
}

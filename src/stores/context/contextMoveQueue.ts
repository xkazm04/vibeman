/**
 * Context Move Queue - Optimistic Batch Update System
 *
 * Provides optimistic UI updates for context moves with a transaction queue
 * that batches multiple operations and flushes on idle or after a short delay.
 *
 * Features:
 * - Immediate optimistic UI updates
 * - Batched database writes for efficiency
 * - Automatic rollback on failure
 * - Configurable flush delay
 */

import { Context } from './contextStoreTypes';

export interface ContextMoveOperation {
  contextId: string;
  previousGroupId: string | null;
  newGroupId: string | null;
  timestamp: number;
}

export interface OptimisticUpdate {
  operation: ContextMoveOperation;
  status: 'pending' | 'flushing' | 'completed' | 'failed';
}

export interface ContextMoveQueueOptions {
  flushDelay?: number; // Delay before flushing queue (default: 500ms)
  onOptimisticUpdate?: (contextId: string, newGroupId: string | null) => void;
  onFlush?: (operations: ContextMoveOperation[]) => Promise<void>;
  onRollback?: (operations: ContextMoveOperation[]) => void;
  onError?: (error: Error, operations: ContextMoveOperation[]) => void;
}

/**
 * Transaction queue for batching context move operations
 */
export class ContextMoveQueue {
  private queue: OptimisticUpdate[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushDelay: number;
  private isFlushing: boolean = false;
  private onOptimisticUpdate?: (contextId: string, newGroupId: string | null) => void;
  private onFlush?: (operations: ContextMoveOperation[]) => Promise<void>;
  private onRollback?: (operations: ContextMoveOperation[]) => void;
  private onError?: (error: Error, operations: ContextMoveOperation[]) => void;

  constructor(options: ContextMoveQueueOptions = {}) {
    this.flushDelay = options.flushDelay ?? 500;
    this.onOptimisticUpdate = options.onOptimisticUpdate;
    this.onFlush = options.onFlush;
    this.onRollback = options.onRollback;
    this.onError = options.onError;
  }

  /**
   * Configure callbacks after construction
   */
  configure(options: Partial<ContextMoveQueueOptions>): void {
    if (options.onOptimisticUpdate) this.onOptimisticUpdate = options.onOptimisticUpdate;
    if (options.onFlush) this.onFlush = options.onFlush;
    if (options.onRollback) this.onRollback = options.onRollback;
    if (options.onError) this.onError = options.onError;
    if (options.flushDelay !== undefined) this.flushDelay = options.flushDelay;
  }

  /**
   * Enqueue a context move operation with optimistic update
   */
  enqueue(contextId: string, previousGroupId: string | null, newGroupId: string | null): void {
    // Skip if moving to the same group
    if (previousGroupId === newGroupId) {
      return;
    }

    // Check for duplicate operations on the same context
    const existingIndex = this.queue.findIndex(
      (item) => item.operation.contextId === contextId && item.status === 'pending'
    );

    const operation: ContextMoveOperation = {
      contextId,
      previousGroupId,
      newGroupId,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      // Update existing pending operation - keep original previousGroupId for proper rollback
      const existingOp = this.queue[existingIndex].operation;
      this.queue[existingIndex] = {
        operation: {
          ...operation,
          previousGroupId: existingOp.previousGroupId, // Preserve original for rollback
        },
        status: 'pending',
      };
    } else {
      // Add new operation
      this.queue.push({
        operation,
        status: 'pending',
      });
    }

    // Apply optimistic update immediately
    if (this.onOptimisticUpdate) {
      this.onOptimisticUpdate(contextId, newGroupId);
    }

    // Reset and start flush timer
    this.scheduleFlush();
  }

  /**
   * Schedule a flush after the configured delay
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.flushDelay);
  }

  /**
   * Force immediate flush of pending operations
   */
  async flushNow(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Internal flush implementation
   */
  private async flush(): Promise<void> {
    if (this.isFlushing) {
      // Already flushing, reschedule
      this.scheduleFlush();
      return;
    }

    // Get pending operations
    const pendingUpdates = this.queue.filter((item) => item.status === 'pending');

    if (pendingUpdates.length === 0) {
      return;
    }

    this.isFlushing = true;

    // Mark as flushing
    pendingUpdates.forEach((item) => {
      item.status = 'flushing';
    });

    const operations = pendingUpdates.map((item) => item.operation);

    try {
      if (this.onFlush) {
        await this.onFlush(operations);
      }

      // Mark as completed and remove from queue
      pendingUpdates.forEach((item) => {
        item.status = 'completed';
      });

      // Clean up completed operations
      this.queue = this.queue.filter((item) => item.status !== 'completed');
    } catch (error) {
      // Mark as failed
      pendingUpdates.forEach((item) => {
        item.status = 'failed';
      });

      // Trigger rollback
      if (this.onRollback) {
        this.onRollback(operations);
      }

      // Notify error handler
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)), operations);
      }

      // Clean up failed operations
      this.queue = this.queue.filter((item) => item.status !== 'failed');
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Get the current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Get pending operation count
   */
  get pendingCount(): number {
    return this.queue.filter((item) => item.status === 'pending').length;
  }

  /**
   * Check if queue is currently flushing
   */
  get flushing(): boolean {
    return this.isFlushing;
  }

  /**
   * Clear all pending operations without flushing
   */
  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
  }

  /**
   * Destroy the queue and clean up timers
   */
  destroy(): void {
    this.clear();
    this.onOptimisticUpdate = undefined;
    this.onFlush = undefined;
    this.onRollback = undefined;
    this.onError = undefined;
  }
}

/**
 * Create a singleton instance for global use
 */
let globalQueueInstance: ContextMoveQueue | null = null;

export function getContextMoveQueue(): ContextMoveQueue {
  if (!globalQueueInstance) {
    globalQueueInstance = new ContextMoveQueue();
  }
  return globalQueueInstance;
}

/**
 * Reset the global queue instance (useful for testing)
 */
export function resetContextMoveQueue(): void {
  if (globalQueueInstance) {
    globalQueueInstance.destroy();
    globalQueueInstance = null;
  }
}

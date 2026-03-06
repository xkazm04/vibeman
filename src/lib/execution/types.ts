/**
 * Unified Execution Types
 *
 * Defines the common execution model shared across CLI, Conductor,
 * Claude Code, Scan Queue, and Remote Mesh execution systems.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Execution Status Values
// ─────────────────────────────────────────────────────────────────────────────

import type { ExecutableLifecycleStatus } from '@/lib/status';
export type ExecutionStatus = ExecutableLifecycleStatus;

export type ExecutionBackend =
  | 'cli'        // Local CLI execution
  | 'conductor'  // Conductor pipeline orchestration
  | 'claude'     // Claude Code async queue
  | 'scan'       // Background scan queue
  | 'remote';    // Remote mesh distributed execution

// ─────────────────────────────────────────────────────────────────────────────
// Core Execution Task Model
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutionProgress {
  phase?: string;           // Current execution phase (e.g., 'scanning', 'analyzing')
  percentComplete?: number; // 0-100
  message?: string;         // Status message for UI
  itemsCurrent?: number;    // Progress counter (e.g., 5 of 10)
  itemsTotal?: number;
  startedAt?: number;       // Unix timestamp (ms)
  estimatedEnd?: number;    // Unix timestamp (ms)
}

export interface ExecutionError {
  code: string;             // 'timeout', 'cancelled', 'validation_failed', etc.
  message: string;
  details?: Record<string, unknown>;
  retriable?: boolean;      // True if executor should retry
}

export interface ExecutionTask<T = unknown> {
  // Identification
  id: string;               // Unique execution ID
  backend: ExecutionBackend; // Which system executed this
  taskType: string;         // 'scan', 'triage', 'execute', 'claude-code', etc.
  
  // Status
  status: ExecutionStatus;
  createdAt: number;        // Unix timestamp (ms)
  startedAt?: number;
  completedAt?: number;
  
  // Progress & Communication
  progress: ExecutionProgress;
  lastUpdate: number;       // Unix timestamp (ms) of last progress update
  
  // Results
  result?: T;               // Execution output (polymorphic by taskType)
  error?: ExecutionError;   // Error details if failed
  
  // Metadata
  projectId?: string;       // Which project this ran in
  sourceId?: string;        // Reference to triggering event/direction/idea
  tags?: Record<string, string>; // Custom tags (e.g., { scanType: 'structure' })
  timeout?: number;         // Timeout in ms (0 = no limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutionConfig<TInput = unknown> {
  // Task definition
  taskType: string;         // Identifies what kind of task (required for routing)
  backend?: ExecutionBackend; // Preferred backend (executor may override)
  
  // Input
  payload: TInput;          // Task-specific input data
  
  // Context
  projectId?: string;
  sourceId?: string;        // For tracing back to direction/idea/signal
  tags?: Record<string, string>;
  
  // Execution control
  timeout?: number;         // Max execution time in ms
  retryCount?: number;      // Max retries (default 0)
  priority?: 'low' | 'normal' | 'high'; // Execution priority
  
  // Progress reporting
  onProgress?: (progress: ExecutionProgress) => void;
  onStatusChange?: (status: ExecutionStatus) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Executor Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface UnifiedExecutor {
  /**
   * Submit a task for execution.
   * Returns immediately with execution ID (task runs asynchronously).
   */
  submit<T = unknown>(config: ExecutionConfig<T>): Promise<string>;
  
  /**
   * Wait for a task to complete.
   * @param executionId - ID returned by submit()
   * @param timeout - Max wait time in ms (0 = no limit)
   * @returns Completed ExecutionTask (success or failure)
   */
  waitFor<T = unknown>(
    executionId: string,
    timeout?: number
  ): Promise<ExecutionTask<T>>;
  
  /**
   * Get current status of a running task.
   */
  getStatus<T = unknown>(executionId: string): Promise<ExecutionTask<T> | null>;
  
  /**
   * Cancel a running task.
   */
  cancel(executionId: string): Promise<void>;
  
  /**
   * Subscribe to progress updates.
   * @returns Unsubscribe function
   */
  onProgress(
    executionId: string,
    callback: (progress: ExecutionProgress) => void
  ): () => void;
  
  /**
   * List recent executions (for monitoring/debugging).
   */
  listRecent(options?: {
    backend?: ExecutionBackend;
    limit?: number;
    status?: ExecutionStatus;
  }): Promise<ExecutionTask[]>;
  
  /**
   * Cleanup old execution records (for maintenance).
   */
  cleanup(olderThanMs: number): Promise<number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend Provider Interface (for implementing backends)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutionBackendProvider {
  readonly backend: ExecutionBackend;
  
  canHandle(taskType: string, backend?: ExecutionBackend): boolean;
  
  submit<T>(config: ExecutionConfig<T>): Promise<string>;
  
  getStatus<T>(executionId: string): Promise<ExecutionTask<T> | null>;
  
  cancel(executionId: string): Promise<void>;
  
  listRecent(options?: {
    limit?: number;
    status?: ExecutionStatus;
  }): Promise<ExecutionTask[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution Storage Interface (for persistence)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutionStorage {
  /**
   * Save execution task (create or update).
   */
  save<T>(task: ExecutionTask<T>): Promise<void>;
  
  /**
   * Load execution task by ID.
   */
  load<T>(executionId: string): Promise<ExecutionTask<T> | null>;
  
  /**
   * List recent executions.
   */
  list(options?: {
    backend?: ExecutionBackend;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<ExecutionTask[]>;
  
  /**
   * Delete old executions.
   */
  delete(executionIds: string[]): Promise<number>;
}

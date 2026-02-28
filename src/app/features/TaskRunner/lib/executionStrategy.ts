/**
 * Execution Strategy Interface
 *
 * Defines a unified contract for task execution backends.
 * Three implementations exist:
 * - TerminalStrategy: executes via claude-terminal (CLI sessions)
 * - QueueStrategy: executes via claudeExecutionQueue (async server-side)
 * - RemoteMeshStrategy: executes via device mesh commands
 *
 * The TaskRunner UI is strategy-agnostic — it interacts only with this interface.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Minimal task descriptor that all strategies understand.
 * Strategies don't need to know about UI concerns (selection, column, etc.)
 */
export interface ExecutionTask {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  requirementName: string;
  /** Direct prompt content - if provided, executes this instead of a requirement file */
  directPrompt?: string;
}

/**
 * Execution result returned after task completes or fails.
 */
export interface ExecutionResult {
  success: boolean;
  /** Opaque execution/task ID from the backend (for streaming/cancellation) */
  executionId?: string;
  /** URL for SSE stream (if applicable) */
  streamUrl?: string;
  /** Claude session ID for resumption */
  claudeSessionId?: string;
  /** Error message on failure */
  error?: string;
}

/**
 * Status of a running execution, returned by getStatus().
 */
export interface ExecutionStatus {
  state: 'pending' | 'running' | 'completed' | 'failed';
  /** Progress as 0-100 percentage (if available) */
  progress?: number;
  /** Claude session ID (if captured) */
  claudeSessionId?: string;
  error?: string;
}

/**
 * Execution event emitted during streaming.
 */
export interface ExecutionEvent {
  type: 'status' | 'message' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'heartbeat';
  data?: unknown;
  timestamp: number;
}

/**
 * Callback for execution events.
 */
export type ExecutionEventHandler = (event: ExecutionEvent) => void;

/**
 * Options for execute().
 */
export interface ExecuteOptions {
  /** Claude session ID to resume from */
  resumeSessionId?: string;
  /** Callback for real-time execution events */
  onEvent?: ExecutionEventHandler;
  /** Git config for post-execution operations */
  gitConfig?: {
    enabled: boolean;
    commands: string[];
    commitMessage: string;
  };
  /** CLI provider ('claude' | 'gemini') */
  provider?: string;
  /** Model override for the provider */
  model?: string | null;
}

// ============================================================================
// Strategy Interface
// ============================================================================

/**
 * ExecutionStrategy — the contract every execution backend implements.
 *
 * Lifecycle:
 * 1. execute(task, options) → starts execution, returns ExecutionResult
 * 2. getStatus(executionId) → polls current status (optional)
 * 3. cancel(executionId) → aborts a running execution
 * 4. stream(executionId, onEvent) → subscribes to real-time events (optional)
 * 5. cleanup() → releases all resources (SSE connections, polling intervals)
 */
export type StrategyCapability = 'stream' | 'status';

export interface ExecutionStrategy {
  /** Human-readable name for this strategy */
  readonly name: string;

  /**
   * Capabilities supported by this strategy.
   * Used for type-narrowing to safely access optional methods.
   */
  readonly capabilities: readonly StrategyCapability[];

  /**
   * Start executing a task.
   * Returns immediately with an executionId for tracking.
   */
  execute(task: ExecutionTask, options?: ExecuteOptions): Promise<ExecutionResult>;

  /**
   * Cancel a running execution.
   * Returns true if cancellation was initiated successfully.
   */
  cancel(executionId: string): Promise<boolean>;

  /**
   * Get the current status of an execution.
   * Only available if 'status' is in capabilities.
   * Returns undefined if the execution is unknown.
   */
  getStatus?(executionId: string): Promise<ExecutionStatus | undefined>;

  /**
   * Subscribe to real-time events for an execution.
   * Only available if 'stream' is in capabilities.
   * Returns an unsubscribe function.
   */
  stream?(executionId: string, onEvent: ExecutionEventHandler): () => void;

  /**
   * Release all resources held by this strategy instance.
   * Call on component unmount or strategy switch.
   */
  cleanup(): void;
}

/**
 * Type-narrowing helper for ExecutionStrategy capabilities.
 * Lets callers safely access optional methods only when the strategy declares support.
 *
 * Usage:
 * if (hasCapability(strategy, 'stream')) {
 *   strategy.stream(id, handler); // TypeScript knows stream exists here
 * }
 */
export function hasCapability<C extends StrategyCapability>(
  strategy: ExecutionStrategy,
  cap: C
): strategy is ExecutionStrategy & (C extends 'stream' ? { stream: NonNullable<ExecutionStrategy['stream']> } : { getStatus: NonNullable<ExecutionStrategy['getStatus']> }) {
  return (strategy.capabilities as readonly string[]).includes(cap);
}

// ============================================================================
// Strategy Registry
// ============================================================================

export type StrategyType = 'terminal' | 'queue' | 'remote-mesh' | 'vscode';

const strategyFactories = new Map<StrategyType, () => ExecutionStrategy>();

/**
 * Register a strategy factory. Call once per strategy at module load time.
 */
export function registerStrategy(type: StrategyType, factory: () => ExecutionStrategy): void {
  strategyFactories.set(type, factory);
}

/**
 * Create a strategy instance by type.
 * Throws if the strategy type hasn't been registered.
 */
export function createStrategy(type: StrategyType): ExecutionStrategy {
  const factory = strategyFactories.get(type);
  if (!factory) {
    throw new Error(`Unknown execution strategy: ${type}. Available: ${Array.from(strategyFactories.keys()).join(', ')}`);
  }
  return factory();
}

/**
 * Get all registered strategy types.
 */
export function getAvailableStrategies(): StrategyType[] {
  return Array.from(strategyFactories.keys());
}

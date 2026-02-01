/**
 * Resilience Strategy Types
 *
 * Defines interfaces for implementing layered fallback patterns in agentic systems.
 * Based on the Observer-Sentinel pattern demonstrated in cliExecutionManager:
 * - SSE streaming as primary communication
 * - Polling fallback when streaming fails
 * - File system state as durable completion signal
 *
 * In agentic systems, any communication channel can fail, so completion detection
 * must be multi-modal. Each layer compensates for the previous layer's failure.
 */

/**
 * Result of a detection attempt
 */
export interface DetectionResult<T = unknown> {
  /** Whether the detection succeeded */
  detected: boolean;
  /** The detected state/value if successful */
  value?: T;
  /** Error information if detection failed */
  error?: string;
  /** Which layer detected the result */
  layer?: string;
}

/**
 * Configuration for a single detection layer
 */
export interface DetectionLayer<T = unknown> {
  /** Unique identifier for this layer */
  id: string;
  /** Human-readable name */
  name: string;
  /** Priority (lower = tried first) */
  priority: number;
  /** Whether this layer is enabled */
  enabled: boolean;
  /** The detection function */
  detect: () => Promise<DetectionResult<T>>;
  /** Optional cleanup function */
  cleanup?: () => void;
}

/**
 * Configuration for a resilience strategy
 */
export interface ResilienceConfig {
  /** Maximum time to wait across all layers (ms) */
  timeout?: number;
  /** Whether to try all layers or stop at first success */
  tryAll?: boolean;
  /** Callback when switching between layers */
  onLayerSwitch?: (fromLayer: string, toLayer: string, reason: string) => void;
  /** Callback when a layer fails */
  onLayerFailure?: (layer: string, error: string) => void;
  /** Callback when detection succeeds */
  onSuccess?: (layer: string, result: unknown) => void;
}

/**
 * Result of executing a resilience strategy
 */
export interface ResilienceResult<T = unknown> {
  /** Whether detection was successful */
  success: boolean;
  /** The detected value */
  value?: T;
  /** Which layer succeeded */
  successLayer?: string;
  /** Layers that were tried */
  layersTried: string[];
  /** Errors from each layer */
  layerErrors: Record<string, string>;
  /** Total time taken (ms) */
  duration: number;
}

/**
 * A resilience strategy with layered fallbacks
 */
export interface ResilienceStrategy<T = unknown> {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** The detection layers in priority order */
  layers: DetectionLayer<T>[];
  /** Configuration */
  config: ResilienceConfig;
  /** Execute the strategy */
  execute: () => Promise<ResilienceResult<T>>;
  /** Add a layer */
  addLayer: (layer: DetectionLayer<T>) => void;
  /** Remove a layer */
  removeLayer: (layerId: string) => void;
  /** Enable/disable a layer */
  setLayerEnabled: (layerId: string, enabled: boolean) => void;
  /** Cleanup all layers */
  cleanup: () => void;
}

/**
 * Common completion states for task detection
 */
export type TaskCompletionState =
  | { status: 'completed'; result?: unknown }
  | { status: 'failed'; error: string }
  | { status: 'running' }
  | { status: 'unknown' };

/**
 * Pre-built layer types for common patterns
 */
export type LayerType =
  | 'sse'          // Server-Sent Events streaming
  | 'polling'      // HTTP polling
  | 'websocket'    // WebSocket connection
  | 'file-state'   // File system state check
  | 'database'     // Database state check
  | 'memory';      // In-memory state check

/**
 * Factory options for creating common layers
 */
export interface SSELayerOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  completionEvent?: string;
  errorEvent?: string;
}

export interface PollingLayerOptions {
  url: string;
  interval: number;
  maxAttempts?: number;
  isComplete: (response: unknown) => boolean;
  extractResult?: (response: unknown) => unknown;
}

export interface FileStateLayerOptions {
  checkFn: () => Promise<boolean>;
  /** If true, file NOT existing means completion */
  absenceMeansComplete?: boolean;
}

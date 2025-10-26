/**
 * Core polling types and interfaces for the reusable polling library
 */

/**
 * Configuration options for polling behavior
 */
export interface PollingConfig {
  /** Polling interval in milliseconds */
  interval: number;
  /** Whether to execute immediately on mount */
  executeImmediately?: boolean;
  /** Maximum number of retries on failure */
  maxRetries?: number;
  /** Backoff strategy for retries */
  retryBackoff?: 'linear' | 'exponential';
  /** Base delay for retry backoff (ms) */
  retryDelay?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Timeout for individual poll operations (ms) */
  timeout?: number;
  /** Function to determine if polling should continue */
  shouldContinue?: (result: any) => boolean;
  /** Error handler for poll failures */
  onError?: (error: Error, retryCount: number) => void;
  /** Success handler for poll results */
  onSuccess?: (result: any) => void;
  /** Adaptive polling configuration */
  adaptive?: AdaptivePollingConfig;
}

/**
 * Adaptive polling configuration for dynamic interval adjustment
 */
export interface AdaptivePollingConfig {
  /** Enable adaptive polling */
  enabled: boolean;
  /** Minimum polling interval (ms) */
  minInterval: number;
  /** Maximum polling interval (ms) */
  maxInterval: number;
  /** Multiplier for increasing interval on success */
  successMultiplier?: number;
  /** Multiplier for decreasing interval on failure */
  failureMultiplier?: number;
  /** Threshold for consecutive successes to increase interval */
  successThreshold?: number;
  /** Threshold for consecutive failures to decrease interval */
  failureThreshold?: number;
}

/**
 * Result returned by the polling hook
 */
export interface PollingResult<T> {
  /** Current data from the last successful poll */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Error from the last failed poll */
  error: Error | null;
  /** Number of retry attempts for current operation */
  retryCount: number;
  /** Current polling interval (may change with adaptive polling) */
  currentInterval: number;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Manual trigger function */
  trigger: () => Promise<void>;
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Reset state and restart polling */
  reset: () => void;
  /** Statistics for monitoring */
  stats: PollingStats;
}

/**
 * Statistics tracked during polling operations
 */
export interface PollingStats {
  /** Total number of polls executed */
  totalPolls: number;
  /** Number of successful polls */
  successfulPolls: number;
  /** Number of failed polls */
  failedPolls: number;
  /** Average response time (ms) */
  averageLatency: number;
  /** Last poll timestamp */
  lastPollTime: number | null;
  /** Consecutive successes */
  consecutiveSuccesses: number;
  /** Consecutive failures */
  consecutiveFailures: number;
}

/**
 * Factory function type for creating polling configurations
 */
export type PollerFactory<T> = (options?: Partial<PollingConfig>) => {
  config: PollingConfig;
  fetcher: () => Promise<T>;
};

/**
 * Preset polling strategy types
 */
export type PollingStrategy = 'aggressive' | 'conservative' | 'adaptive' | 'realtime' | 'background';

/**
 * Options for preset polling strategies
 */
export interface PresetOptions extends Partial<PollingConfig> {
  strategy?: PollingStrategy;
}

/**
 * Log refresh specific configuration
 */
export interface LogRefreshConfig extends PollingConfig {
  /** Maximum number of log lines to fetch */
  maxLines?: number;
  /** Filter pattern for logs */
  filter?: string;
  /** Log level filter */
  level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Status check specific configuration
 */
export interface StatusCheckConfig extends PollingConfig {
  /** Expected status values */
  expectedStatus?: string[];
  /** Stop polling when status matches */
  stopOnMatch?: boolean;
  /** Alert on status change */
  alertOnChange?: boolean;
}

/**
 * Health monitor specific configuration
 */
export interface HealthMonitorConfig extends PollingConfig {
  /** Health check endpoints */
  endpoints?: string[];
  /** Critical threshold (% of failed checks) */
  criticalThreshold?: number;
  /** Warning threshold (% of failed checks) */
  warningThreshold?: number;
  /** Notification callback */
  onHealthChange?: (health: 'healthy' | 'warning' | 'critical') => void;
}

/**
 * Poller instance metadata for dashboard tracking
 */
export interface PollerMetadata {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Poller type/category */
  type: 'log-refresh' | 'status-check' | 'health-monitor' | 'custom';
  /** Current configuration */
  config: PollingConfig;
  /** Current statistics */
  stats: PollingStats;
  /** Creation timestamp */
  createdAt: number;
  /** Whether poller is currently active */
  isActive: boolean;
}

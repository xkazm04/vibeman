/**
 * Preset polling configurations for different use cases
 */

import { PollingConfig, PollingStrategy } from './types';

/**
 * Aggressive polling preset
 * - Fast polling interval (1-2 seconds)
 * - Quick retries with exponential backoff
 * - Suitable for: Real-time logs, active task monitoring
 */
const AGGRESSIVE: PollingConfig = {
  interval: 1500,
  executeImmediately: true,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryDelay: 500,
  timeout: 5000,
  enabled: true,
};

/**
 * Conservative polling preset
 * - Moderate polling interval (5-10 seconds)
 * - Standard retry strategy
 * - Suitable for: Status checks, periodic updates, background monitoring
 */
const CONSERVATIVE: PollingConfig = {
  interval: 5000,
  executeImmediately: true,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryDelay: 1000,
  timeout: 10000,
  enabled: true,
};

/**
 * Adaptive polling preset
 * - Starts at 3 seconds, adjusts based on success/failure
 * - Increases interval on consecutive successes (up to 30 seconds)
 * - Decreases interval on consecutive failures (down to 1 second)
 * - Suitable for: Dynamic workloads, variable response times, resource optimization
 */
const ADAPTIVE: PollingConfig = {
  interval: 3000,
  executeImmediately: true,
  maxRetries: 5,
  retryBackoff: 'exponential',
  retryDelay: 1000,
  timeout: 15000,
  enabled: true,
  adaptive: {
    enabled: true,
    minInterval: 1000,
    maxInterval: 30000,
    successMultiplier: 1.5,
    failureMultiplier: 0.7,
    successThreshold: 3,
    failureThreshold: 2,
  },
};

/**
 * Real-time polling preset
 * - Very fast polling (500ms - 1 second)
 * - Minimal retries (data changes rapidly anyway)
 * - Short timeout to avoid stale data
 * - Suitable for: Live dashboards, real-time metrics, active user interfaces
 */
const REALTIME: PollingConfig = {
  interval: 1000,
  executeImmediately: true,
  maxRetries: 1,
  retryBackoff: 'linear',
  retryDelay: 200,
  timeout: 3000,
  enabled: true,
};

/**
 * Background polling preset
 * - Slow polling interval (30-60 seconds)
 * - More retries with longer delays
 * - Suitable for: Health checks, low-priority monitoring, resource-constrained environments
 */
const BACKGROUND: PollingConfig = {
  interval: 30000,
  executeImmediately: true,
  maxRetries: 5,
  retryBackoff: 'linear',
  retryDelay: 2000,
  timeout: 20000,
  enabled: true,
};

/**
 * Manual/On-Demand preset
 * - Polling disabled by default
 * - Used with manual trigger
 * - Suitable for: User-initiated refreshes, manual data fetching
 */
const MANUAL: PollingConfig = {
  interval: 0,
  executeImmediately: false,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryDelay: 1000,
  timeout: 10000,
  enabled: false,
};

/**
 * Burst polling preset
 * - Fast polling for short duration, then backs off
 * - Combines aggressive initial polling with adaptive slowdown
 * - Suitable for: Task completion monitoring, deployment tracking
 */
const BURST: PollingConfig = {
  interval: 2000,
  executeImmediately: true,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryDelay: 500,
  timeout: 8000,
  enabled: true,
  adaptive: {
    enabled: true,
    minInterval: 2000,
    maxInterval: 20000,
    successMultiplier: 1.8,
    failureMultiplier: 0.8,
    successThreshold: 2,
    failureThreshold: 3,
  },
};

/**
 * All polling presets
 */
export const POLLING_PRESETS: Record<PollingStrategy | 'manual' | 'burst', PollingConfig> = {
  aggressive: AGGRESSIVE,
  conservative: CONSERVATIVE,
  adaptive: ADAPTIVE,
  realtime: REALTIME,
  background: BACKGROUND,
  manual: MANUAL,
  burst: BURST,
};

/**
 * Get a preset configuration by strategy name
 *
 * @param strategy - The polling strategy name
 * @returns The preset configuration
 *
 * @example
 * ```tsx
 * const config = getPreset('aggressive');
 * const { data } = usePollingTask(fetcher, config);
 * ```
 */
export function getPreset(strategy: PollingStrategy | 'manual' | 'burst'): PollingConfig {
  return POLLING_PRESETS[strategy];
}

/**
 * Create a custom configuration by merging a preset with custom options
 *
 * @param strategy - Base strategy to start with
 * @param overrides - Custom options to override preset values
 * @returns Merged configuration
 *
 * @example
 * ```tsx
 * const config = mergePreset('aggressive', {
 *   interval: 3000,
 *   onSuccess: (data) => console.log('Got data:', data)
 * });
 * ```
 */
export function mergePreset(
  strategy: PollingStrategy | 'manual' | 'burst',
  overrides: Partial<PollingConfig>
): PollingConfig {
  const baseConfig = POLLING_PRESETS[strategy];
  return {
    ...baseConfig,
    ...overrides,
    // Merge adaptive config if both exist
    adaptive: overrides.adaptive && baseConfig.adaptive
      ? { ...baseConfig.adaptive, ...overrides.adaptive }
      : overrides.adaptive || baseConfig.adaptive,
  };
}

/**
 * Preset use case recommendations
 */
export const PRESET_USE_CASES = {
  aggressive: [
    'Real-time log tailing',
    'Active task status monitoring',
    'Live data feeds',
    'User-initiated actions with immediate feedback',
  ],
  conservative: [
    'Periodic status checks',
    'Background data synchronization',
    'Low-priority monitoring',
    'Resource-friendly polling',
  ],
  adaptive: [
    'Variable workload monitoring',
    'Smart resource optimization',
    'Long-running task tracking',
    'Mixed-priority data updates',
  ],
  realtime: [
    'Live dashboards',
    'Real-time metrics visualization',
    'Active monitoring screens',
    'Collaborative editing indicators',
  ],
  background: [
    'Health checks',
    'Periodic system status',
    'Low-frequency data updates',
    'Idle state monitoring',
  ],
  manual: [
    'User-triggered refreshes',
    'On-demand data fetching',
    'Pull-to-refresh patterns',
    'Manual sync operations',
  ],
  burst: [
    'Task completion monitoring',
    'Deployment tracking',
    'Build status watching',
    'Time-limited intensive polling',
  ],
} as const;

/**
 * Get recommended use cases for a strategy
 *
 * @param strategy - The polling strategy
 * @returns Array of use case descriptions
 */
export function getUseCases(strategy: PollingStrategy | 'manual' | 'burst'): readonly string[] {
  return PRESET_USE_CASES[strategy];
}

/**
 * Configuration recommendations based on data characteristics
 */
export const PRESET_RECOMMENDATIONS = {
  /**
   * For data that changes frequently (< 5 seconds)
   */
  frequentChanges: ['aggressive', 'realtime', 'burst'] as const,

  /**
   * For data that changes occasionally (5-30 seconds)
   */
  occasionalChanges: ['conservative', 'adaptive'] as const,

  /**
   * For data that changes rarely (> 30 seconds)
   */
  rareChanges: ['background', 'adaptive'] as const,

  /**
   * For optimizing server load
   */
  loadOptimized: ['adaptive', 'background', 'conservative'] as const,

  /**
   * For real-time user experience
   */
  realTimeUX: ['aggressive', 'realtime', 'burst'] as const,

  /**
   * For battery/resource conservation
   */
  resourceConserving: ['background', 'conservative', 'manual'] as const,
} as const;

/**
 * Get preset recommendation based on update frequency
 *
 * @param expectedUpdateSeconds - Expected time between data changes in seconds
 * @returns Recommended strategy
 */
export function recommendStrategy(expectedUpdateSeconds: number): PollingStrategy | 'burst' {
  if (expectedUpdateSeconds < 2) {
    return 'realtime';
  } else if (expectedUpdateSeconds < 5) {
    return 'aggressive';
  } else if (expectedUpdateSeconds < 15) {
    return 'conservative';
  } else if (expectedUpdateSeconds < 60) {
    return 'adaptive';
  } else {
    return 'background';
  }
}

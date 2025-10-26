/**
 * Factory functions for creating common polling scenarios
 */

import {
  PollerFactory,
  LogRefreshConfig,
  StatusCheckConfig,
  HealthMonitorConfig,
  PollingConfig,
} from './types';
import { POLLING_PRESETS } from './presets';

/**
 * Create a log refresh poller with optimized configuration for frequent log updates
 *
 * @param endpoint - API endpoint for log fetching
 * @param options - Additional configuration options
 * @returns Factory object with config and fetcher
 *
 * @example
 * ```tsx
 * const logPoller = createLogRefreshPoller('/api/logs/server-123', {
 *   maxLines: 100,
 *   filter: 'ERROR',
 *   interval: 2000
 * });
 * const { data } = usePollingTask(logPoller.fetcher, logPoller.config);
 * ```
 */
export function createLogRefreshPoller<T = any>(
  endpoint: string,
  options?: Partial<LogRefreshConfig>
): { config: PollingConfig; fetcher: () => Promise<T> } {
  const {
    maxLines,
    filter,
    level,
    ...configOptions
  } = options || {};

  // Use aggressive preset for logs (fast updates)
  const baseConfig = POLLING_PRESETS.aggressive;

  const config: PollingConfig = {
    ...baseConfig,
    ...configOptions,
    interval: configOptions.interval ?? 2000, // Default 2 seconds for logs
    maxRetries: configOptions.maxRetries ?? 2, // Fewer retries for logs
    onError: (error, retryCount) => {
      console.warn(`[LogRefresh] Poll failed (attempt ${retryCount}):`, error.message);
      if (configOptions.onError) {
        configOptions.onError(error, retryCount);
      }
    },
  };

  const fetcher = async (): Promise<T> => {
    const params = new URLSearchParams();
    if (maxLines) params.append('maxLines', maxLines.toString());
    if (filter) params.append('filter', filter);
    if (level) params.append('level', level);

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Log fetch failed: ${response.statusText}`);
    }

    return response.json();
  };

  return { config, fetcher };
}

/**
 * Create a status check poller for monitoring task/process status
 *
 * @param endpoint - API endpoint for status checking
 * @param options - Additional configuration options
 * @returns Factory object with config and fetcher
 *
 * @example
 * ```tsx
 * const statusPoller = createStatusCheckPoller('/api/tasks/task-123/status', {
 *   expectedStatus: ['completed', 'failed'],
 *   stopOnMatch: true,
 *   alertOnChange: true
 * });
 * const { data } = usePollingTask(statusPoller.fetcher, statusPoller.config);
 * ```
 */
export function createStatusCheckPoller<T = any>(
  endpoint: string,
  options?: Partial<StatusCheckConfig>
): { config: PollingConfig; fetcher: () => Promise<T> } {
  const {
    expectedStatus = [],
    stopOnMatch = true,
    alertOnChange = false,
    ...configOptions
  } = options || {};

  let previousStatus: string | null = null;

  // Use conservative preset for status checks
  const baseConfig = POLLING_PRESETS.conservative;

  const config: PollingConfig = {
    ...baseConfig,
    ...configOptions,
    interval: configOptions.interval ?? 5000, // Default 5 seconds
    shouldContinue: (result) => {
      if (configOptions.shouldContinue && !configOptions.shouldContinue(result)) {
        return false;
      }

      // Stop if status matches expected
      if (stopOnMatch && expectedStatus.length > 0 && result?.status) {
        return !expectedStatus.includes(result.status);
      }

      return true;
    },
    onSuccess: (result) => {
      // Alert on status change
      if (alertOnChange && result?.status && result.status !== previousStatus) {
        console.info(`[StatusCheck] Status changed: ${previousStatus} -> ${result.status}`);
        previousStatus = result.status;
      }

      if (configOptions.onSuccess) {
        configOptions.onSuccess(result);
      }
    },
  };

  const fetcher = async (): Promise<T> => {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  };

  return { config, fetcher };
}

/**
 * Create a health monitor poller for checking system/service health
 *
 * @param endpoints - Single endpoint or array of endpoints to monitor
 * @param options - Additional configuration options
 * @returns Factory object with config and fetcher
 *
 * @example
 * ```tsx
 * const healthPoller = createHealthMonitorPoller(
 *   ['/api/health/database', '/api/health/cache'],
 *   {
 *     criticalThreshold: 50,
 *     warningThreshold: 20,
 *     onHealthChange: (health) => {
 *       if (health === 'critical') {
 *         showAlert('System health is critical!');
 *       }
 *     }
 *   }
 * );
 * const { data } = usePollingTask(healthPoller.fetcher, healthPoller.config);
 * ```
 */
export function createHealthMonitorPoller<T = any>(
  endpoints: string | string[],
  options?: Partial<HealthMonitorConfig>
): { config: PollingConfig; fetcher: () => Promise<T> } {
  const {
    criticalThreshold = 50,
    warningThreshold = 20,
    onHealthChange,
    ...configOptions
  } = options || {};

  const endpointArray = Array.isArray(endpoints) ? endpoints : [endpoints];
  let previousHealth: 'healthy' | 'warning' | 'critical' | null = null;

  // Use background preset for health monitoring
  const baseConfig = POLLING_PRESETS.background;

  const config: PollingConfig = {
    ...baseConfig,
    ...configOptions,
    interval: configOptions.interval ?? 30000, // Default 30 seconds
    onSuccess: (result) => {
      // Calculate health status
      const failureRate = (result.failedChecks / result.totalChecks) * 100;
      let currentHealth: 'healthy' | 'warning' | 'critical';

      if (failureRate >= criticalThreshold) {
        currentHealth = 'critical';
      } else if (failureRate >= warningThreshold) {
        currentHealth = 'warning';
      } else {
        currentHealth = 'healthy';
      }

      // Notify on health change
      if (currentHealth !== previousHealth && onHealthChange) {
        onHealthChange(currentHealth);
      }
      previousHealth = currentHealth;

      if (configOptions.onSuccess) {
        configOptions.onSuccess(result);
      }
    },
  };

  const fetcher = async (): Promise<T> => {
    const results = await Promise.allSettled(
      endpointArray.map(async (endpoint) => {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Health check failed for ${endpoint}`);
        }
        return response.json();
      })
    );

    const totalChecks = results.length;
    const failedChecks = results.filter(r => r.status === 'rejected').length;
    const successfulChecks = totalChecks - failedChecks;

    const endpointResults = results.map((result, index) => ({
      endpoint: endpointArray[index],
      status: result.status === 'fulfilled' ? 'healthy' : 'failed',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));

    return {
      totalChecks,
      successfulChecks,
      failedChecks,
      failureRate: (failedChecks / totalChecks) * 100,
      endpoints: endpointResults,
      timestamp: Date.now(),
    } as T;
  };

  return { config, fetcher };
}

/**
 * Create a custom poller with manual configuration
 *
 * @param fetcher - Custom fetch function
 * @param config - Polling configuration
 * @returns Factory object with config and fetcher
 *
 * @example
 * ```tsx
 * const customPoller = createCustomPoller(
 *   async () => {
 *     const data = await myCustomFetch();
 *     return processData(data);
 *   },
 *   POLLING_PRESETS.adaptive
 * );
 * const { data } = usePollingTask(customPoller.fetcher, customPoller.config);
 * ```
 */
export function createCustomPoller<T>(
  fetcher: () => Promise<T>,
  config: PollingConfig
): { config: PollingConfig; fetcher: () => Promise<T> } {
  return { config, fetcher };
}

/**
 * Create a poller that monitors a file or resource for changes
 *
 * @param endpoint - API endpoint that returns resource metadata (e.g., lastModified)
 * @param options - Additional configuration options
 * @returns Factory object with config and fetcher
 *
 * @example
 * ```tsx
 * const fileWatcher = createFileWatchPoller('/api/files/config.json/metadata', {
 *   onChangeDetected: (newData) => {
 *     console.log('File changed:', newData);
 *     reloadConfig();
 *   }
 * });
 * const { data } = usePollingTask(fileWatcher.fetcher, fileWatcher.config);
 * ```
 */
export function createFileWatchPoller<T = any>(
  endpoint: string,
  options?: {
    onChangeDetected?: (data: T) => void;
  } & Partial<PollingConfig>
): { config: PollingConfig; fetcher: () => Promise<T> } {
  const { onChangeDetected, ...configOptions } = options || {};
  let lastModified: number | null = null;

  const baseConfig = POLLING_PRESETS.conservative;

  const config: PollingConfig = {
    ...baseConfig,
    ...configOptions,
    interval: configOptions.interval ?? 5000,
    onSuccess: (result) => {
      const currentModified = result?.lastModified || result?.timestamp || Date.now();

      if (lastModified !== null && currentModified > lastModified && onChangeDetected) {
        onChangeDetected(result);
      }

      lastModified = currentModified;

      if (configOptions.onSuccess) {
        configOptions.onSuccess(result);
      }
    },
  };

  const fetcher = async (): Promise<T> => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`File watch failed: ${response.statusText}`);
    }
    return response.json();
  };

  return { config, fetcher };
}

/**
 * Create a real-time data poller for live updates (e.g., dashboards, metrics)
 *
 * @param endpoint - API endpoint for real-time data
 * @param options - Additional configuration options
 * @returns Factory object with config and fetcher
 *
 * @example
 * ```tsx
 * const metricsPoller = createRealTimePoller('/api/metrics/live', {
 *   interval: 1000, // Update every second
 *   bufferSize: 50
 * });
 * const { data } = usePollingTask(metricsPoller.fetcher, metricsPoller.config);
 * ```
 */
export function createRealTimePoller<T = any>(
  endpoint: string,
  options?: { bufferSize?: number } & Partial<PollingConfig>
): { config: PollingConfig; fetcher: () => Promise<T> } {
  const { bufferSize = 100, ...configOptions } = options || {};
  const dataBuffer: T[] = [];

  const baseConfig = POLLING_PRESETS.realtime;

  const config: PollingConfig = {
    ...baseConfig,
    ...configOptions,
    interval: configOptions.interval ?? 1000, // Default 1 second
    onSuccess: (result) => {
      // Maintain a buffer of recent data
      dataBuffer.push(result);
      if (dataBuffer.length > bufferSize) {
        dataBuffer.shift();
      }

      if (configOptions.onSuccess) {
        configOptions.onSuccess(result);
      }
    },
  };

  const fetcher = async (): Promise<T> => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Real-time poll failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Attach buffer history for time-series visualization
    return {
      ...data,
      history: [...dataBuffer],
      timestamp: Date.now(),
    } as T;
  };

  return { config, fetcher };
}

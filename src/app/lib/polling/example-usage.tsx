/**
 * Example usage demonstrations for the polling library
 * This file is for documentation purposes only
 */

// @ts-nocheck - Example file with intentionally loose typing for documentation
'use client';

import React from 'react';
import {
  usePollingTask,
  createLogRefreshPoller,
  createStatusCheckPoller,
  createHealthMonitorPoller,
  POLLING_PRESETS,
  mergePreset,
} from './index';

/**
 * Example 1: Basic Polling
 * Simple periodic data fetching with default configuration
 */
export function Example1_BasicPolling() {
  const { data, isLoading, error } = usePollingTask(
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
    {
      interval: 5000, // Poll every 5 seconds
      maxRetries: 3,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Data: {JSON.stringify(data)}</div>;
}

/**
 * Example 2: Log Refresh with Factory
 * Using factory function for common log refresh scenario
 */
export function Example2_LogRefresh({ serverId }: { serverId: string }) {
  const logPoller = createLogRefreshPoller<string[]>(`/api/logs/${serverId}`, {
    maxLines: 100,
    filter: 'ERROR',
    interval: 2000,
  });

  const { data: logs, stats, isPolling, stop, start } = usePollingTask<string[]>(
    logPoller.fetcher,
    logPoller.config
  );

  return (
    <div>
      <div>
        <button onClick={isPolling ? stop : start}>
          {isPolling ? 'Pause' : 'Resume'}
        </button>
        <span>
          Success Rate: {((stats.successfulPolls / stats.totalPolls) * 100).toFixed(1)}%
        </span>
      </div>
      <pre>{logs?.join('\n')}</pre>
    </div>
  );
}

/**
 * Example 3: Status Check with Auto-Stop
 * Monitor task status and stop when complete
 */
interface TaskStatus {
  status: string;
  progress: number;
}

export function Example3_StatusCheck({ taskId }: { taskId: string }) {
  const statusPoller = createStatusCheckPoller<TaskStatus>(`/api/tasks/${taskId}/status`, {
    expectedStatus: ['completed', 'failed'],
    stopOnMatch: true,
    alertOnChange: true,
    interval: 3000,
  });

  const { data: status, isPolling } = usePollingTask<TaskStatus>(
    statusPoller.fetcher,
    statusPoller.config
  );

  return (
    <div>
      <div>Status: {status?.status || 'Unknown'}</div>
      <div>Progress: {status?.progress || 0}%</div>
      {isPolling && <div>Monitoring...</div>}
      {!isPolling && <div>Monitoring stopped</div>}
    </div>
  );
}

/**
 * Example 4: Health Monitoring
 * Check multiple service endpoints
 */
interface HealthStatus {
  failureRate: number;
  endpoints: Array<{ endpoint: string; status: string }>;
}

export function Example4_HealthMonitor() {
  const healthPoller = createHealthMonitorPoller<HealthStatus>(
    ['/api/health/database', '/api/health/cache', '/api/health/api'],
    {
      criticalThreshold: 50,
      warningThreshold: 20,
      onHealthChange: () => {
        // Health status changed
      },
    }
  );

  const { data: health } = usePollingTask<HealthStatus>(healthPoller.fetcher, healthPoller.config);

  const getHealthColor = () => {
    if (!health) return 'gray';
    if (health.failureRate >= 50) return 'red';
    if (health.failureRate >= 20) return 'orange';
    return 'green';
  };

  return (
    <div>
      <h3>System Health</h3>
      <div style={{ color: getHealthColor() }}>
        Failure Rate: {health?.failureRate.toFixed(1)}%
      </div>
      {health?.endpoints.map((endpoint) => (
        <div key={endpoint.endpoint}>
          {endpoint.endpoint}: {endpoint.status}
        </div>
      ))}
    </div>
  );
}

/**
 * Example 5: Using Presets
 * Quick setup with pre-configured strategies
 */
export function Example5_WithPresets() {
  // Aggressive preset for real-time updates
  const { data: realtimeData } = usePollingTask(
    async () => fetch('/api/metrics/realtime').then((r) => r.json()),
    POLLING_PRESETS.aggressive
  );

  // Conservative preset for background monitoring
  const { data: statusData } = usePollingTask(
    async () => fetch('/api/status').then((r) => r.json()),
    POLLING_PRESETS.conservative
  );

  // Adaptive preset with custom options
  const adaptiveConfig = mergePreset('adaptive', {
    onSuccess: (data) => {
      // Data updated
    },
    onError: (error) => {
      // Error occurred
    },
  });

  const { data: adaptiveData } = usePollingTask(
    async () => fetch('/api/data').then((r) => r.json()),
    adaptiveConfig
  );

  return (
    <div>
      <div>Real-time: {JSON.stringify(realtimeData)}</div>
      <div>Status: {JSON.stringify(statusData)}</div>
      <div>Adaptive: {JSON.stringify(adaptiveData)}</div>
    </div>
  );
}

/**
 * Example 6: Manual Control
 * Full control over polling lifecycle
 */
export function Example6_ManualControl() {
  const { data, isPolling, isLoading, start, stop, trigger, reset, stats } = usePollingTask(
    async () => fetch('/api/data').then((r) => r.json()),
    {
      interval: 5000,
      enabled: false, // Start disabled
    }
  );

  return (
    <div>
      <div>
        <button onClick={start} disabled={isPolling}>
          Start Polling
        </button>
        <button onClick={stop} disabled={!isPolling}>
          Stop Polling
        </button>
        <button onClick={trigger} disabled={isLoading}>
          Refresh Now
        </button>
        <button onClick={reset}>Reset</button>
      </div>

      <div>
        Status: {isPolling ? 'Polling' : 'Stopped'}
        {isLoading && ' (Loading...)'}
      </div>

      <div>
        <h4>Statistics</h4>
        <div>Total Polls: {stats.totalPolls}</div>
        <div>Success Rate: {((stats.successfulPolls / stats.totalPolls) * 100).toFixed(1)}%</div>
        <div>Avg Latency: {stats.averageLatency.toFixed(0)}ms</div>
      </div>

      <div>Data: {JSON.stringify(data)}</div>
    </div>
  );
}

/**
 * Example 7: Conditional Polling
 * Stop polling when a condition is met
 */
export function Example7_ConditionalPolling({ targetValue }: { targetValue: number }) {
  const { data, isPolling } = usePollingTask(
    async () => {
      const response = await fetch('/api/counter');
      return response.json();
    },
    {
      interval: 2000,
      shouldContinue: (result) => {
        // Stop when counter reaches target
        return result.counter < targetValue;
      },
      onSuccess: (result) => {
        if (result.counter >= targetValue) {
          // Target reached
        }
      },
    }
  );

  return (
    <div>
      <div>Current: {data?.counter || 0}</div>
      <div>Target: {targetValue}</div>
      <div>{isPolling ? 'Polling...' : 'Target reached!'}</div>
    </div>
  );
}

/**
 * Example 8: Multiple Concurrent Pollers
 * Run different pollers simultaneously
 */
export function Example8_MultiplePollers() {
  // Fast polling for logs
  const logs = usePollingTask(
    async () => fetch('/api/logs').then((r) => r.json()),
    POLLING_PRESETS.aggressive
  );

  // Medium polling for status
  const status = usePollingTask(
    async () => fetch('/api/status').then((r) => r.json()),
    POLLING_PRESETS.conservative
  );

  // Slow polling for health
  const health = usePollingTask(
    async () => fetch('/api/health').then((r) => r.json()),
    POLLING_PRESETS.background
  );

  return (
    <div>
      <div>
        <h3>Logs</h3>
        <div>Updates: {logs.stats.totalPolls} times</div>
        <pre>{JSON.stringify(logs.data, null, 2)}</pre>
      </div>

      <div>
        <h3>Status</h3>
        <div>Updates: {status.stats.totalPolls} times</div>
        <div>{JSON.stringify(status.data)}</div>
      </div>

      <div>
        <h3>Health</h3>
        <div>Updates: {health.stats.totalPolls} times</div>
        <div>{JSON.stringify(health.data)}</div>
      </div>
    </div>
  );
}

/**
 * Example 9: Adaptive Polling
 * Automatically adjust interval based on success/failure
 */
export function Example9_AdaptivePolling() {
  const { data, currentInterval, stats } = usePollingTask(
    async () => fetch('/api/data').then((r) => r.json()),
    {
      interval: 5000,
      adaptive: {
        enabled: true,
        minInterval: 2000,
        maxInterval: 20000,
        successMultiplier: 1.5,
        failureMultiplier: 0.7,
        successThreshold: 3,
        failureThreshold: 2,
      },
    }
  );

  return (
    <div>
      <div>
        <h3>Adaptive Polling</h3>
        <div>Current Interval: {currentInterval}ms</div>
        <div>Consecutive Successes: {stats.consecutiveSuccesses}</div>
        <div>Consecutive Failures: {stats.consecutiveFailures}</div>
        <div>Avg Latency: {stats.averageLatency.toFixed(0)}ms</div>
      </div>
      <div>Data: {JSON.stringify(data)}</div>
    </div>
  );
}

/**
 * Example 10: Error Handling
 * Custom error handling with retry logic
 */
export function Example10_ErrorHandling() {
  const { data, error, retryCount, stats } = usePollingTask(
    async () => {
      const response = await fetch('/api/unreliable-endpoint');
      if (!response.ok) throw new Error('Request failed');
      return response.json();
    },
    {
      interval: 5000,
      maxRetries: 5,
      retryBackoff: 'exponential',
      retryDelay: 1000,
      onError: (error, attempt) => {
        // Poll failed

        // Show notification on persistent failures
        if (attempt >= 3) {
          // Connection issues detected
        }
      },
      onSuccess: (data) => {
        // Poll succeeded
      },
    }
  );

  return (
    <div>
      {error && (
        <div style={{ color: 'red' }}>
          Error: {error.message}
          {retryCount > 0 && ` (Retry attempt ${retryCount})`}
        </div>
      )}

      <div>
        <h4>Error Statistics</h4>
        <div>Failed Polls: {stats.failedPolls}</div>
        <div>Successful Polls: {stats.successfulPolls}</div>
        <div>
          Success Rate: {stats.totalPolls > 0 ? ((stats.successfulPolls / stats.totalPolls) * 100).toFixed(1) : 0}%
        </div>
      </div>

      {data && <div>Data: {JSON.stringify(data)}</div>}
    </div>
  );
}

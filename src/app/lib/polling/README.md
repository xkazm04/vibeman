# Polling Utilities Library

A comprehensive, reusable polling library for React applications with built-in retry logic, adaptive intervals, error handling, and performance monitoring.

## Overview

The polling library provides a flexible and powerful abstraction for periodic data fetching with features like:

- **Automatic retry logic** with configurable backoff strategies
- **Adaptive polling** that adjusts intervals based on success/failure rates
- **Performance monitoring** with latency tracking and success/failure statistics
- **Factory functions** for common scenarios (log refresh, status checks, health monitoring)
- **Preset configurations** optimized for different use cases
- **TypeScript support** with comprehensive type definitions
- **Resource cleanup** with AbortController integration

## Quick Start

### Basic Usage

```tsx
import { usePollingTask } from '@/app/lib/polling';

function MyComponent() {
  const { data, isLoading, error, stats } = usePollingTask(
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
```

### Using Factory Functions

```tsx
import { usePollingTask, createLogRefreshPoller } from '@/app/lib/polling';

function LogViewer({ serverId }) {
  const logPoller = createLogRefreshPoller(`/api/logs/${serverId}`, {
    maxLines: 100,
    filter: 'ERROR',
    interval: 2000,
  });

  const { data: logs, stats } = usePollingTask(
    logPoller.fetcher,
    logPoller.config
  );

  return (
    <div>
      <div>Success Rate: {(stats.successfulPolls / stats.totalPolls * 100).toFixed(1)}%</div>
      <div>Avg Latency: {stats.averageLatency.toFixed(0)}ms</div>
      <pre>{logs?.join('\n')}</pre>
    </div>
  );
}
```

### Using Presets

```tsx
import { usePollingTask, POLLING_PRESETS, mergePreset } from '@/app/lib/polling';

function StatusMonitor() {
  const config = mergePreset('aggressive', {
    onSuccess: (data) => console.log('Status updated:', data),
    onError: (error) => console.error('Poll failed:', error),
  });

  const { data, start, stop } = usePollingTask(
    async () => fetch('/api/status').then(r => r.json()),
    config
  );

  return (
    <div>
      <button onClick={start}>Start Polling</button>
      <button onClick={stop}>Stop Polling</button>
      <div>Status: {data?.status}</div>
    </div>
  );
}
```

## Core API

### `usePollingTask<T>(fetcher, config)`

Main hook for polling operations.

**Parameters:**
- `fetcher: () => Promise<T>` - Async function that fetches data
- `config: PollingConfig` - Configuration options

**Returns:** `PollingResult<T>`
```typescript
{
  data: T | null;              // Current data
  isLoading: boolean;          // Loading state
  error: Error | null;         // Last error
  retryCount: number;          // Current retry count
  currentInterval: number;     // Current polling interval (ms)
  isPolling: boolean;          // Whether actively polling
  trigger: () => Promise<void>; // Manual trigger
  start: () => void;           // Start polling
  stop: () => void;            // Stop polling
  reset: () => void;           // Reset and restart
  stats: PollingStats;         // Performance statistics
}
```

### `PollingConfig`

Configuration options for polling behavior:

```typescript
{
  interval: number;                    // Polling interval (ms)
  executeImmediately?: boolean;        // Execute on mount (default: true)
  maxRetries?: number;                 // Max retry attempts (default: 3)
  retryBackoff?: 'linear' | 'exponential'; // Backoff strategy (default: 'exponential')
  retryDelay?: number;                 // Base retry delay (ms, default: 1000)
  enabled?: boolean;                   // Enable polling (default: true)
  timeout?: number;                    // Operation timeout (ms)
  shouldContinue?: (result) => boolean; // Continue condition
  onError?: (error, retryCount) => void; // Error handler
  onSuccess?: (result) => void;        // Success handler
  adaptive?: AdaptivePollingConfig;    // Adaptive polling config
}
```

### `PollingStats`

Performance statistics tracked during polling:

```typescript
{
  totalPolls: number;           // Total polls executed
  successfulPolls: number;      // Successful polls
  failedPolls: number;          // Failed polls
  averageLatency: number;       // Average response time (ms)
  lastPollTime: number | null;  // Last poll timestamp
  consecutiveSuccesses: number; // Current success streak
  consecutiveFailures: number;  // Current failure streak
}
```

## Factory Functions

Pre-configured factory functions for common polling scenarios.

### `createLogRefreshPoller(endpoint, options)`

Optimized for frequent log updates.

```tsx
const logPoller = createLogRefreshPoller('/api/logs/server-123', {
  maxLines: 100,
  filter: 'ERROR',
  level: 'error',
  interval: 2000,
});

const { data } = usePollingTask(logPoller.fetcher, logPoller.config);
```

**Options:**
- `maxLines?: number` - Maximum log lines to fetch
- `filter?: string` - Filter pattern for logs
- `level?: 'debug' | 'info' | 'warn' | 'error'` - Log level filter
- Plus all standard `PollingConfig` options

### `createStatusCheckPoller(endpoint, options)`

Monitor task/process status with automatic termination.

```tsx
const statusPoller = createStatusCheckPoller('/api/tasks/task-123/status', {
  expectedStatus: ['completed', 'failed'],
  stopOnMatch: true,
  alertOnChange: true,
  interval: 5000,
});

const { data } = usePollingTask(statusPoller.fetcher, statusPoller.config);
```

**Options:**
- `expectedStatus?: string[]` - Expected status values
- `stopOnMatch?: boolean` - Stop when status matches expected
- `alertOnChange?: boolean` - Console log on status change
- Plus all standard `PollingConfig` options

### `createHealthMonitorPoller(endpoints, options)`

Check system/service health across multiple endpoints.

```tsx
const healthPoller = createHealthMonitorPoller(
  ['/api/health/database', '/api/health/cache', '/api/health/api'],
  {
    criticalThreshold: 50,
    warningThreshold: 20,
    onHealthChange: (health) => {
      if (health === 'critical') {
        showAlert('System health is critical!');
      }
    },
  }
);

const { data } = usePollingTask(healthPoller.fetcher, healthPoller.config);
```

**Options:**
- `endpoints?: string[]` - Health check endpoints
- `criticalThreshold?: number` - Critical failure % (default: 50)
- `warningThreshold?: number` - Warning failure % (default: 20)
- `onHealthChange?: (health) => void` - Health change callback
- Plus all standard `PollingConfig` options

**Returns data:**
```typescript
{
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  failureRate: number;
  endpoints: Array<{
    endpoint: string;
    status: 'healthy' | 'failed';
    data: any;
    error: string | null;
  }>;
  timestamp: number;
}
```

### `createFileWatchPoller(endpoint, options)`

Monitor file/resource changes.

```tsx
const fileWatcher = createFileWatchPoller('/api/files/config.json/metadata', {
  onChangeDetected: (newData) => {
    console.log('File changed:', newData);
    reloadConfig();
  },
});

const { data } = usePollingTask(fileWatcher.fetcher, fileWatcher.config);
```

### `createRealTimePoller(endpoint, options)`

Real-time data polling with history buffer.

```tsx
const metricsPoller = createRealTimePoller('/api/metrics/live', {
  interval: 1000,
  bufferSize: 50,
});

const { data } = usePollingTask(metricsPoller.fetcher, metricsPoller.config);
// data includes { ...currentData, history: [...], timestamp }
```

### `createCustomPoller(fetcher, config)`

Create a custom poller with manual configuration.

```tsx
const customPoller = createCustomPoller(
  async () => {
    const data = await myCustomFetch();
    return processData(data);
  },
  POLLING_PRESETS.adaptive
);

const { data } = usePollingTask(customPoller.fetcher, customPoller.config);
```

## Polling Presets

Pre-configured strategies optimized for different use cases.

### Available Presets

| Preset | Interval | Use Cases |
|--------|----------|-----------|
| `aggressive` | 1.5s | Real-time logs, active monitoring |
| `conservative` | 5s | Status checks, background updates |
| `adaptive` | 3s (dynamic) | Variable workloads, resource optimization |
| `realtime` | 1s | Live dashboards, real-time metrics |
| `background` | 30s | Health checks, low-priority monitoring |
| `manual` | N/A | User-triggered refreshes |
| `burst` | 2s (adaptive) | Task completion, deployment tracking |

### Using Presets

```tsx
import { POLLING_PRESETS, getPreset, mergePreset } from '@/app/lib/polling';

// Direct preset usage
const config1 = POLLING_PRESETS.aggressive;

// Get preset by name
const config2 = getPreset('conservative');

// Merge preset with custom options
const config3 = mergePreset('adaptive', {
  interval: 10000,
  onSuccess: (data) => console.log(data),
});

const { data } = usePollingTask(fetcher, config3);
```

### Preset Details

#### Aggressive
```typescript
{
  interval: 1500,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryDelay: 500,
  timeout: 5000,
}
```
**Use cases:** Real-time logs, active task monitoring, live data feeds

#### Conservative
```typescript
{
  interval: 5000,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryDelay: 1000,
  timeout: 10000,
}
```
**Use cases:** Status checks, periodic updates, background monitoring

#### Adaptive
```typescript
{
  interval: 3000,
  maxRetries: 5,
  adaptive: {
    enabled: true,
    minInterval: 1000,
    maxInterval: 30000,
    successMultiplier: 1.5,
    failureMultiplier: 0.7,
    successThreshold: 3,
    failureThreshold: 2,
  }
}
```
**Use cases:** Dynamic workloads, resource optimization, long-running tasks

#### Realtime
```typescript
{
  interval: 1000,
  maxRetries: 1,
  retryBackoff: 'linear',
  retryDelay: 200,
  timeout: 3000,
}
```
**Use cases:** Live dashboards, real-time metrics, active UIs

#### Background
```typescript
{
  interval: 30000,
  maxRetries: 5,
  retryBackoff: 'linear',
  retryDelay: 2000,
  timeout: 20000,
}
```
**Use cases:** Health checks, low-priority monitoring, resource-constrained environments

## Adaptive Polling

Adaptive polling automatically adjusts the polling interval based on consecutive successes or failures.

### Configuration

```typescript
{
  adaptive: {
    enabled: true,
    minInterval: 1000,        // Minimum interval (ms)
    maxInterval: 30000,       // Maximum interval (ms)
    successMultiplier: 1.5,   // Increase interval by 50% on success
    failureMultiplier: 0.7,   // Decrease interval by 30% on failure
    successThreshold: 3,      // Adjust after 3 consecutive successes
    failureThreshold: 2,      // Adjust after 2 consecutive failures
  }
}
```

### How It Works

1. Starts at the configured `interval`
2. Tracks consecutive successes and failures
3. **On success streak:** Increases interval (reduces polling frequency)
4. **On failure streak:** Decreases interval (increases polling frequency)
5. Respects `minInterval` and `maxInterval` boundaries

### Example

```tsx
const { data, currentInterval, stats } = usePollingTask(
  fetcher,
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

console.log('Current interval:', currentInterval);
console.log('Consecutive successes:', stats.consecutiveSuccesses);
```

## Advanced Patterns

### Conditional Polling

Stop polling when a condition is met:

```tsx
const { data } = usePollingTask(
  async () => fetch('/api/task/status').then(r => r.json()),
  {
    interval: 3000,
    shouldContinue: (result) => {
      // Stop polling when task is complete
      return result.status !== 'completed';
    },
  }
);
```

### Error Handling

Custom error handling with retry logic:

```tsx
const { data, error, retryCount } = usePollingTask(
  fetcher,
  {
    interval: 5000,
    maxRetries: 5,
    retryBackoff: 'exponential',
    onError: (error, attempt) => {
      console.error(`Poll failed (attempt ${attempt}):`, error.message);

      if (attempt >= 3) {
        notifyUser('Polling is experiencing issues');
      }
    },
  }
);
```

### Multiple Concurrent Pollers

Run multiple pollers in the same component:

```tsx
function Dashboard() {
  const logs = usePollingTask(
    () => fetch('/api/logs').then(r => r.json()),
    POLLING_PRESETS.aggressive
  );

  const status = usePollingTask(
    () => fetch('/api/status').then(r => r.json()),
    POLLING_PRESETS.conservative
  );

  const health = usePollingTask(
    () => fetch('/api/health').then(r => r.json()),
    POLLING_PRESETS.background
  );

  return (
    <div>
      <LogsPanel logs={logs.data} stats={logs.stats} />
      <StatusPanel status={status.data} />
      <HealthPanel health={health.data} />
    </div>
  );
}
```

### Manual Control

Control polling lifecycle manually:

```tsx
function ManualPollingComponent() {
  const { data, isPolling, start, stop, trigger, reset } = usePollingTask(
    fetcher,
    {
      interval: 5000,
      enabled: false, // Start disabled
    }
  );

  return (
    <div>
      <button onClick={start} disabled={isPolling}>Start</button>
      <button onClick={stop} disabled={!isPolling}>Stop</button>
      <button onClick={trigger}>Refresh Now</button>
      <button onClick={reset}>Reset</button>
      <div>Status: {isPolling ? 'Polling' : 'Stopped'}</div>
      <div>Data: {JSON.stringify(data)}</div>
    </div>
  );
}
```

### Performance Monitoring

Track and display polling performance:

```tsx
function MonitoredComponent() {
  const { data, stats, currentInterval } = usePollingTask(fetcher, config);

  const successRate = stats.totalPolls > 0
    ? (stats.successfulPolls / stats.totalPolls * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div>Success Rate: {successRate}%</div>
      <div>Avg Latency: {stats.averageLatency.toFixed(0)}ms</div>
      <div>Total Polls: {stats.totalPolls}</div>
      <div>Current Interval: {currentInterval}ms</div>
      <div>Consecutive Successes: {stats.consecutiveSuccesses}</div>
    </div>
  );
}
```

## Best Practices

### 1. Choose the Right Preset

- **Real-time UIs:** Use `aggressive` or `realtime`
- **Background monitoring:** Use `background` or `conservative`
- **Variable workloads:** Use `adaptive`
- **Resource optimization:** Use `adaptive` or `conservative`

### 2. Handle Errors Gracefully

```tsx
const config = {
  interval: 5000,
  maxRetries: 3,
  onError: (error, retryCount) => {
    // Log errors for debugging
    console.error('Poll failed:', error);

    // Notify users on persistent failures
    if (retryCount >= 3) {
      showNotification('Connection issues detected');
    }
  },
};
```

### 3. Clean Up Resources

The hook automatically cleans up timers and abort controllers. No manual cleanup needed:

```tsx
function MyComponent() {
  const { data } = usePollingTask(fetcher, config);
  // Cleanup happens automatically on unmount
  return <div>{data}</div>;
}
```

### 4. Use Adaptive Polling for Variable Workloads

```tsx
// Good: Adjusts to actual update frequency
const config = mergePreset('adaptive', {
  adaptive: {
    minInterval: 2000,
    maxInterval: 30000,
  },
});

// Less optimal: Fixed interval may be too fast or too slow
const config = { interval: 5000 };
```

### 5. Implement Conditional Stopping

```tsx
const { data } = usePollingTask(fetcher, {
  interval: 3000,
  shouldContinue: (result) => {
    // Stop when goal achieved
    return !result.completed;
  },
});
```

### 6. Monitor Performance

```tsx
const { stats } = usePollingTask(fetcher, config);

useEffect(() => {
  if (stats.averageLatency > 5000) {
    console.warn('Slow poll detected:', stats.averageLatency);
  }
}, [stats.averageLatency]);
```

## Troubleshooting

### Polling Doesn't Start

Check that `enabled` is `true`:
```tsx
const config = { interval: 5000, enabled: true };
```

### Memory Leaks

The hook handles cleanup automatically. Ensure you're not creating new functions on every render:

```tsx
// Good: Stable fetcher function
const fetcher = useCallback(async () => {
  return fetch('/api/data').then(r => r.json());
}, []);

const { data } = usePollingTask(fetcher, config);
```

### High Server Load

Use slower presets or adaptive polling:
```tsx
const config = mergePreset('adaptive', {
  adaptive: {
    minInterval: 5000,  // Don't poll faster than 5s
    maxInterval: 60000, // Can slow down to 60s
  },
});
```

### Stale Data

Reduce polling interval or use aggressive preset:
```tsx
const config = POLLING_PRESETS.aggressive; // 1.5s interval
```

## TypeScript

The library is fully typed. Import types as needed:

```typescript
import {
  PollingConfig,
  PollingResult,
  PollingStats,
  AdaptivePollingConfig,
  PollerFactory,
} from '@/app/lib/polling';

const config: PollingConfig = {
  interval: 5000,
  maxRetries: 3,
};

const result: PollingResult<MyDataType> = usePollingTask(fetcher, config);
```

## Examples

### Complete Log Viewer

```tsx
import { usePollingTask, createLogRefreshPoller } from '@/app/lib/polling';

function LogViewer({ serverId }: { serverId: string }) {
  const logPoller = createLogRefreshPoller(`/api/logs/${serverId}`, {
    maxLines: 200,
    interval: 2000,
    onError: (error) => console.error('Log fetch failed:', error),
  });

  const { data: logs, isLoading, error, stats, stop, start, isPolling } =
    usePollingTask<string[]>(logPoller.fetcher, logPoller.config);

  return (
    <div className="log-viewer">
      <div className="controls">
        <button onClick={isPolling ? stop : start}>
          {isPolling ? 'Pause' : 'Resume'}
        </button>
        <div className="stats">
          Success Rate: {((stats.successfulPolls / stats.totalPolls) * 100).toFixed(1)}%
          | Latency: {stats.averageLatency.toFixed(0)}ms
        </div>
      </div>

      {isLoading && <div>Loading logs...</div>}
      {error && <div className="error">Error: {error.message}</div>}

      <pre className="log-content">
        {logs?.join('\n') || 'No logs available'}
      </pre>
    </div>
  );
}
```

### Task Status Monitor

```tsx
import { usePollingTask, createStatusCheckPoller } from '@/app/lib/polling';

function TaskMonitor({ taskId }: { taskId: string }) {
  const statusPoller = createStatusCheckPoller(`/api/tasks/${taskId}/status`, {
    expectedStatus: ['completed', 'failed'],
    stopOnMatch: true,
    alertOnChange: true,
    interval: 3000,
  });

  const { data: status, isPolling } = usePollingTask(
    statusPoller.fetcher,
    statusPoller.config
  );

  const getStatusColor = () => {
    switch (status?.status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'running': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <div className="task-monitor">
      <div style={{ color: getStatusColor() }}>
        Status: {status?.status || 'Unknown'}
      </div>
      {isPolling && <div>Monitoring...</div>}
      {!isPolling && <div>Monitoring stopped</div>}
      <div>Progress: {status?.progress || 0}%</div>
    </div>
  );
}
```

### Health Dashboard

```tsx
import { usePollingTask, createHealthMonitorPoller } from '@/app/lib/polling';

function HealthDashboard() {
  const healthPoller = createHealthMonitorPoller(
    ['/api/health/db', '/api/health/cache', '/api/health/api'],
    {
      criticalThreshold: 50,
      warningThreshold: 20,
      onHealthChange: (health) => {
        if (health === 'critical') {
          notifyAdmin('System health is critical!');
        }
      },
    }
  );

  const { data: health, stats } = usePollingTask(
    healthPoller.fetcher,
    healthPoller.config
  );

  const getHealthColor = () => {
    if (!health) return 'gray';
    if (health.failureRate >= 50) return 'red';
    if (health.failureRate >= 20) return 'orange';
    return 'green';
  };

  return (
    <div className="health-dashboard">
      <h2>System Health</h2>
      <div style={{ color: getHealthColor() }}>
        Overall: {health?.failureRate.toFixed(1)}% failure rate
      </div>

      <div className="endpoints">
        {health?.endpoints.map((endpoint) => (
          <div key={endpoint.endpoint} className="endpoint">
            <span>{endpoint.endpoint}</span>
            <span style={{ color: endpoint.status === 'healthy' ? 'green' : 'red' }}>
              {endpoint.status}
            </span>
          </div>
        ))}
      </div>

      <div className="stats">
        Checks: {health?.successfulChecks}/{health?.totalChecks}
        | Avg Response: {stats.averageLatency.toFixed(0)}ms
      </div>
    </div>
  );
}
```

## License

This library is part of the Vibeman project.

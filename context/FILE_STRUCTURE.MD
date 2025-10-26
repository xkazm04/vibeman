# Project File Structure

## Polling Utilities Library (New)

### Overview
A comprehensive, reusable polling library for React applications with built-in retry logic, adaptive intervals, error handling, and performance monitoring. This library provides a flexible abstraction for periodic data fetching across the application.

### Core Structure

```
src/app/lib/polling/
├── index.ts                    # Main export, usePollingTask hook
├── types.ts                    # TypeScript type definitions
├── factories.ts                # Factory functions for common scenarios
├── presets.ts                  # Pre-configured polling strategies
├── PollingDashboard.tsx        # Development dashboard component
├── README.md                   # Comprehensive documentation
└── __tests__/
    └── integration.test.ts     # Integration tests
```

### Component Details

#### index.ts (Core Hook)
- **Main Export**: `usePollingTask<T>(fetcher, config)` - Core polling hook
- **Features**:
  - Automatic retry logic with exponential/linear backoff
  - Adaptive polling that adjusts intervals based on success/failure rates
  - AbortController integration for cleanup
  - Comprehensive performance statistics tracking
  - Manual control functions (start, stop, trigger, reset)
- **State Management**: Uses React hooks for local state
- **Lifecycle**: Automatic cleanup on unmount, handles timer management

#### types.ts (Type Definitions)
- **PollingConfig**: Main configuration interface
- **PollingResult<T>**: Return type from usePollingTask hook
- **PollingStats**: Performance metrics tracking
- **AdaptivePollingConfig**: Adaptive interval configuration
- **PollerFactory<T>**: Factory function type
- **Specialized Configs**: LogRefreshConfig, StatusCheckConfig, HealthMonitorConfig
- **PollerMetadata**: Dashboard tracking interface

#### factories.ts (Factory Functions)
Pre-configured factory functions for common scenarios:
- **createLogRefreshPoller**: Fast log refresh (2s interval, aggressive preset)
- **createStatusCheckPoller**: Task status monitoring with stop conditions
- **createHealthMonitorPoller**: Multi-endpoint health checks with thresholds
- **createFileWatchPoller**: File/resource change detection
- **createRealTimePoller**: Real-time data with history buffer
- **createCustomPoller**: Manual configuration wrapper

#### presets.ts (Configuration Presets)
Seven optimized presets for different use cases:
- **aggressive**: 1.5s interval - Real-time logs, active monitoring
- **conservative**: 5s interval - Status checks, background updates
- **adaptive**: 3s dynamic - Variable workloads, resource optimization
- **realtime**: 1s interval - Live dashboards, metrics
- **background**: 30s interval - Health checks, low-priority monitoring
- **manual**: Disabled - User-triggered only
- **burst**: 2s adaptive - Task completion, deployment tracking

Utility functions:
- `getPreset(strategy)`: Get preset by name
- `mergePreset(strategy, overrides)`: Merge preset with custom options
- `recommendStrategy(updateSeconds)`: Get recommendation based on update frequency

#### PollingDashboard.tsx (Development Tool)
Interactive dashboard for visualizing active pollers:
- **Features**:
  - Real-time poller visualization with sparkline charts
  - Success rate and latency metrics
  - Aggregate statistics across all pollers
  - Minimizable/closable interface
  - Automatically enabled in development mode
- **PollerRegistry**: Singleton registry for tracking all active pollers
- **usePollerDashboard**: Hook for registering pollers with dashboard
- **Components**:
  - `Sparkline`: Mini charts for latency trends
  - `PollerCard`: Individual poller visualization
  - `PollingDashboard`: Main dashboard component

### Integration Patterns

#### Basic Usage
```tsx
const { data, isLoading, error, stats } = usePollingTask(
  async () => fetch('/api/data').then(r => r.json()),
  { interval: 5000, maxRetries: 3 }
);
```

#### With Factory Functions
```tsx
const logPoller = createLogRefreshPoller('/api/logs/server-1', {
  maxLines: 100,
  interval: 2000
});
const { data } = usePollingTask(logPoller.fetcher, logPoller.config);
```

#### With Presets
```tsx
const config = mergePreset('adaptive', {
  onSuccess: (data) => console.log('Updated:', data)
});
const { data } = usePollingTask(fetcher, config);
```

#### Multiple Concurrent Pollers
```tsx
const logs = usePollingTask(fetchLogs, POLLING_PRESETS.aggressive);
const status = usePollingTask(fetchStatus, POLLING_PRESETS.conservative);
const health = usePollingTask(fetchHealth, POLLING_PRESETS.background);
```

### Architecture Decisions

#### 1. Hook-Based Design
- Leverages React's built-in lifecycle management
- Automatic cleanup via useEffect return functions
- State management with useState for simplicity
- Refs for timer and abort controller management

#### 2. Adaptive Polling Algorithm
- Tracks consecutive successes and failures
- Adjusts interval dynamically within min/max bounds
- Multiplier-based adjustment for smooth transitions
- Configurable thresholds for when to adjust

#### 3. Performance Monitoring
- Rolling average for latency (last 100 polls)
- Comprehensive statistics tracking
- Real-time metrics available via dashboard
- No external dependencies for metrics

#### 4. Error Handling Strategy
- Automatic retry with configurable backoff
- Separate retry state from polling state
- User-defined error handlers
- Graceful degradation on persistent failures

#### 5. Factory Pattern
- Encapsulates common configurations
- Reduces boilerplate for standard use cases
- Easy to extend with new factory functions
- Maintains type safety with generics

#### 6. Preset System
- Seven optimized configurations
- Documented use cases for each preset
- Easy customization via mergePreset
- Recommendation function for automatic selection

### Testing Strategy

Integration tests cover:
- Basic polling functionality (start, stop, trigger, reset)
- Retry logic with exponential/linear backoff
- Adaptive polling interval adjustment
- Multiple concurrent pollers
- Factory function configurations
- Preset merging and application
- Performance statistics tracking
- Error scenarios and cleanup

### Dependencies

- **React**: Hooks (useState, useEffect, useRef, useCallback)
- **Framer Motion**: Dashboard animations
- **Lucide React**: Dashboard icons
- **Testing**: @testing-library/react, jest

### Performance Considerations

1. **Timer Management**: Uses setTimeout instead of setInterval for better control
2. **Abort Controllers**: Proper cleanup to prevent memory leaks
3. **Rolling Averages**: Limited to 100 samples to prevent memory growth
4. **Lazy Dashboard**: Only renders when enabled (dev mode)
5. **Optimized Re-renders**: useCallback to stabilize functions

### Future Enhancements

1. **WebSocket Fallback**: Detect when WebSocket is available and switch automatically
2. **Backpressure Handling**: Detect when polls are taking longer than interval
3. **Network Status Detection**: Pause polling when offline
4. **Persistence**: Save/restore polling state across sessions
5. **Rate Limiting**: Built-in rate limiting to prevent server overload
6. **Telemetry Integration**: Export metrics to external monitoring systems

## Existing Project Structure

### Main Application Structure
```
src/
├── app/
│   ├── api/                    # API routes
│   ├── coder/                  # Code editor and context management
│   ├── features/               # Shared feature components
│   │   └── TaskRunner/         # Task runner UI components
│   ├── lib/                    # Shared utilities
│   │   └── polling/            # NEW: Polling utilities library
│   ├── monitor/                # Monitoring and logs
│   ├── projects/               # Project management
│   └── tasker/                 # Task management
├── components/                 # Shared UI components
├── contexts/                   # React contexts
├── lib/                        # Core libraries
│   ├── database.ts            # Main SQLite database
│   ├── processManager.ts      # Process lifecycle management
│   └── langgraph/             # LangGraph AI integration
├── stores/                     # Zustand state stores
└── types/                      # TypeScript type definitions
```

### Key Dependencies and Relationships

#### Polling Library Dependencies
- **Independent**: No internal Vibeman dependencies
- **Exports**: All types, factories, presets, and hooks
- **Used By**: Can be adopted by any feature requiring periodic data fetching

#### Potential Integration Points
1. **TaskRunner** (`src/app/features/TaskRunner/`): Monitor task status with status check poller
2. **Monitor** (`src/app/monitor/`): Real-time log tailing with log refresh poller
3. **Projects** (`src/app/projects/`): Server health monitoring with health monitor poller
4. **Process Manager** (`src/lib/processManager.ts`): Poll process status periodically

### Usage Recommendations

#### When to Use Polling Library
✅ Periodic data refresh (logs, status, metrics)
✅ Task completion monitoring
✅ Health checks and uptime monitoring
✅ Real-time dashboard updates
✅ File/resource change detection

#### When NOT to Use
❌ One-time data fetching (use regular fetch)
❌ Real-time updates where WebSocket is available
❌ User-initiated actions only (use manual trigger instead)
❌ Data that never changes

### Related Files Modified

None - this is a new standalone library with no modifications to existing code.

## Next Steps

### Recommended Next Goal: Adaptive Polling Enhancement

Based on the current implementation, the next logical step is:

**Implement User Activity Detection for Smart Polling**

Create an adaptive polling enhancement that:
1. **Detects User Activity**: Track mouse/keyboard events to determine if user is active
2. **Reduces Load During Inactivity**: Automatically slow down polling when user is idle (>2 minutes)
3. **Burst on Return**: Speed up polling when user returns to the application
4. **Visibility API Integration**: Pause polling when tab is not visible
5. **Network Quality Detection**: Adjust polling based on network latency

**Benefits**:
- Significant reduction in server load during low-activity periods
- Better battery life on mobile devices
- Maintained responsiveness when user is active
- Improved resource utilization

**Implementation Plan**:
1. Create `src/app/lib/polling/adapters/activityDetector.ts` - User activity tracking
2. Add `src/app/lib/polling/adapters/visibilityAdapter.ts` - Tab visibility integration
3. Extend `AdaptivePollingConfig` with activity-based settings
4. Update `usePollingTask` to integrate activity detection
5. Add activity indicators to PollingDashboard
6. Create tests for activity-based adaptive polling

This enhancement builds naturally on the existing adaptive polling foundation while adding intelligent resource optimization based on actual user behavior.

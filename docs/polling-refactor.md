# Polling Infrastructure Refactoring

## Overview

This document describes the unified polling infrastructure used throughout Vibeman to replace ad-hoc polling implementations.

## Problem Statement

Prior to this refactoring, polling was implemented inconsistently across the codebase:

1. **ReflectionStatus.tsx**: 4 separate `useEffect` hooks managing:
   - Exponential backoff polling (4s → 30s)
   - Ref-based cleanup
   - Elapsed time tracking
   - Completion detection

2. **useCanvasData.ts**: Separate 30s `setInterval` with:
   - Pausable flag
   - Manual cleanup
   - Mount/unmount handling

These patterns led to:
- Code duplication
- Inconsistent behavior
- Complex cleanup logic
- Difficult testing

## Solution: Unified Polling Hook

### Core Hook: `usePolling`

Location: `src/hooks/usePolling.ts`

```typescript
usePolling(callback, {
  enabled: boolean,
  intervalMs: number,
  immediate?: boolean
})
```

Features:
- **Automatic cleanup**: Handles unmount and dependency changes
- **Pause/resume**: Controlled via `enabled` flag
- **Immediate execution**: Optional first run
- **Stable references**: Uses refs to avoid stale closures

### Advanced: `createUnifiedPoller`

For non-React contexts or advanced use cases:

```typescript
const poller = createUnifiedPoller(pollCallback, {
  activeIntervalMs: 3000,
  idleIntervalMs: 30000,
  backoff: {
    levels: [4000, 8000, 16000, 30000],
    maxLevel: 4
  },
  maxAttempts: 120,
  onAttempt: (count) => console.log(count),
  onTimeout: () => console.log('Done')
});

poller.start();
poller.signalActivity(); // Switch to active interval
poller.signalIdle(); // Switch to idle interval
poller.stop();
```

## Refactored Components

### 1. ReflectionStatus.tsx

**Before**: 4 separate effects with manual backoff logic

**After**: Simple exponential backoff with clear separation of concerns

```typescript
const isRunning = reflectionStatus === 'running';
const attemptCountRef = useRef(0);

useEffect(() => {
  if (!isRunning) {
    attemptCountRef.current = 0;
    return;
  }

  const getNextInterval = () => {
    const baseInterval = POLL_INITIAL_MS;
    const interval = baseInterval * Math.pow(2, attemptCountRef.current);
    return Math.min(interval, POLL_MAX_MS);
  };

  let timeoutId: NodeJS.Timeout | null = null;

  const schedulePoll = () => {
    const interval = getNextInterval();
    timeoutId = setTimeout(() => {
      refreshStatus();
      attemptCountRef.current++;
      schedulePoll();
    }, interval);
  };

  schedulePoll();

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    attemptCountRef.current = 0;
  };
}, [isRunning, scope, activeProject?.id]);
```

**Benefits**:
- Single effect instead of 4
- Clear exponential backoff (4s → 8s → 16s → 30s max)
- Automatic cleanup on unmount
- Resets on status change

### 2. useCanvasData.ts

**Before**: Manual `setInterval` with ref-based cleanup

**After**: Unified polling with pause/resume

```typescript
// Initial fetch on mount
useEffect(() => {
  if (!enabled || !activeProject?.id) {
    store.setEvents([], null);
    setStatus({ isLoading: false, error: null });
    return;
  }

  setStatus(prev => ({ ...prev, isLoading: true }));
  fetchSignals(activeProject.id);
}, [activeProject?.id, enabled, fetchSignals, store]);

// Unified polling with pause/resume support
usePolling(refresh, {
  enabled: enabled && !!activeProject?.id,
  intervalMs: REFRESH_INTERVAL_MS,
  immediate: false, // Initial fetch handled above
});
```

**Benefits**:
- Separation of initial fetch and polling
- Automatic pause when disabled or no project
- Consistent 30s interval
- No manual cleanup needed

## Testing

### Unit Tests

Location: `tests/unit/useCanvasData.test.ts`

Tests:
- Initial loading state
- Fetch on mount
- Disabled state handling
- Refresh function availability
- Error handling
- Empty project handling

### Integration Tests

Location: `tests/integration/ReflectionStatusPolling.test.tsx`

Tests:
- Exponential backoff correctness (4s → 8s → 16s → 30s)
- Stop polling on status change
- Backoff reset on restart
- Dependency change handling
- Pause/resume behavior
- Fixed interval for canvas data

## Migration Guide

### For Simple Fixed-Interval Polling

Replace:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 30000);

  return () => clearInterval(interval);
}, [dependencies]);
```

With:
```typescript
usePolling(fetchData, {
  enabled: true,
  intervalMs: 30000,
  immediate: false
});
```

### For Conditional Polling

Replace:
```typescript
useEffect(() => {
  if (!shouldPoll) return;

  const interval = setInterval(() => {
    fetchData();
  }, 5000);

  return () => clearInterval(interval);
}, [shouldPoll, dependencies]);
```

With:
```typescript
usePolling(fetchData, {
  enabled: shouldPoll,
  intervalMs: 5000,
  immediate: true
});
```

### For Exponential Backoff

Use manual effect with exponential calculation (see ReflectionStatus example above)

Or use `createUnifiedPoller` with backoff configuration:

```typescript
const pollerRef = useRef<UnifiedPoller | null>(null);

useEffect(() => {
  const poller = createUnifiedPoller(
    () => fetchData(),
    {
      activeIntervalMs: 4000,
      backoff: {
        levels: [4000, 8000, 16000, 30000]
      }
    }
  );

  pollerRef.current = poller;
  poller.start();

  return () => poller.stop();
}, [dependencies]);
```

## Performance Considerations

1. **Stale-while-revalidate**: Polling errors don't clear existing data
2. **Automatic cleanup**: No memory leaks from forgotten intervals
3. **Debounced restarts**: Dependency changes properly cleanup before restart
4. **Exponential backoff**: Reduces server load for long-running tasks

## Future Improvements

1. Add support for WebSocket fallback when available
2. Implement visibility-aware polling (pause on hidden tab)
3. Add network-aware polling (reduce frequency on slow connections)
4. Create dashboard for monitoring all active pollers
5. Add request deduplication for concurrent pollers

## Related Files

- `src/hooks/usePolling.ts` - Main hook implementation
- `src/app/lib/hooks/usePollingTask.ts` - Legacy alternative (comprehensive, abort-based)
- `src/app/features/Brain/components/ReflectionStatus.tsx` - Exponential backoff example
- `src/app/features/Brain/sub_MemoryCanvas/lib/useCanvasData.ts` - Fixed interval example
- `tests/unit/useCanvasData.test.ts` - Unit tests
- `tests/integration/ReflectionStatusPolling.test.tsx` - Integration tests

## Decision Log

### Why not use `usePollingTask`?

`usePollingTask` (`src/app/lib/hooks/usePollingTask.ts`) is a comprehensive hook with:
- AbortController-based cancellation
- Built-in retry logic
- Stale-while-revalidate
- TypeScript generics

However, we chose `usePolling` for this refactor because:
1. Simpler API matches existing usage patterns
2. Exponential backoff needed custom logic anyway
3. Manual interval control needed for ReflectionStatus
4. Smaller bundle size for simple use cases

`usePollingTask` should be used for:
- API calls needing AbortSignal support
- Complex retry strategies
- Type-safe response handling
- Task-based polling with completion detection

### Why manual backoff for ReflectionStatus?

We considered using `createUnifiedPoller` with backoff config, but chose manual implementation because:
1. More transparent for this critical feature
2. Easier to adjust intervals without touching shared code
3. Clear reset behavior on status changes
4. Better matches existing mental model

## References

- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [React: useEffect cleanup](https://react.dev/reference/react/useEffect#cleanup-function)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)

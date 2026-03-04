# Reflection Completion Cascade

## Overview
When a Brain reflection completes, multiple UI components need to refresh their data (insights, effectiveness scores, outcomes). Previously, users had to manually refresh or wait for the next polling cycle. The completion cascade system automatically triggers component refreshes when a reflection completes.

## Architecture

### Event Emitter (`reflectionCompletionEmitter`)
Lightweight subscription pattern for reflection completion events. Components subscribe to receive notifications when reflections complete.

**Location:** `src/stores/reflectionCompletionEmitter.ts`

```typescript
// Subscribe to completion events
const unsubscribe = subscribeToReflectionCompletion((reflectionId, projectId, scope) => {
  if (projectId === activeProject.id) {
    refetchInsights();
  }
});
```

### Store Detection (`brainStore`)
The brainStore detects when `lastReflection.completed_at` changes and emits completion events.

**Detection points:**
1. `_fetchReflectionStatus()` - Compares new vs previous `completed_at` timestamps
2. `fetchDashboard()` - Checks for completion during dashboard refresh

**Emission logic:**
```typescript
const hasJustCompleted =
  newReflection &&
  newReflection.status === 'completed' &&
  newReflection.completed_at &&
  (
    !prevReflection ||
    prevReflection.completed_at !== newReflection.completed_at ||
    prevReflection.id !== newReflection.id
  );

if (hasJustCompleted) {
  reflectionCompletionEmitter.emit(reflectionId, projectId, scope);
}
```

### Component Subscriptions
Components subscribe to completion events and invalidate their cached data.

**Subscribed components:**
- `InsightsPanel` - Refetches insights list
- `BrainEffectivenessWidget` - Recomputes effectiveness scores
- `OutcomesSummary` - Refreshes outcome statistics

## Usage Pattern

### In Components
```typescript
import { subscribeToReflectionCompletion } from '@/stores/reflectionCompletionEmitter';

function MyComponent() {
  const activeProject = useActiveProjectStore(state => state.activeProject);

  useEffect(() => {
    const unsubscribe = subscribeToReflectionCompletion((reflectionId, projectId, scope) => {
      // Filter by scope and project
      if (scope === 'project' && projectId === activeProject?.id) {
        refetchData();
      }
    });

    return unsubscribe; // Cleanup on unmount
  }, [activeProject?.id, refetchData]);
}
```

### Scope Filtering
- **Project reflections:** `scope === 'project'` - filter by `projectId`
- **Global reflections:** `scope === 'global'` - affects all projects

## Benefits

1. **Instant feedback** - UI updates immediately after reflection completes
2. **No manual refresh** - Users don't need to click refresh buttons
3. **Efficient** - Only refetches when completion is detected, not on every poll
4. **Lightweight** - Simple event emitter with Set-based subscriptions
5. **Decoupled** - Components don't depend on polling schedules

## Flow Diagram

```
Reflection Completes
        ↓
API: POST /api/brain/reflection/{id}/complete
        ↓
brainService.completeReflection()
        ↓
Database updates reflection.completed_at
        ↓
Component polls fetchReflectionStatus()
        ↓
brainStore detects new completed_at
        ↓
reflectionCompletionEmitter.emit(reflectionId, projectId, scope)
        ↓
Subscribed components receive event
        ↓
Components refetch: insights, effectiveness, outcomes
        ↓
UI updates automatically
```

## Testing

**Test file:** `tests/unit/stores/reflectionCompletionEmitter.test.ts`

Tests verify:
- Subscription and unsubscription
- Event emission to multiple listeners
- Listener isolation after unsubscribe
- Error handling in listeners
- Listener count tracking

## Migration Notes

**Before:**
- Components polled every 4-30 seconds
- Manual refresh required for immediate updates
- Polling even when no reflection was running

**After:**
- Components poll for reflection status (only when running)
- Completion triggers immediate cascade refresh
- No manual refresh needed

## Performance

- **Memory:** O(n) where n = number of subscribed components (~3 components)
- **CPU:** O(n) per emission (negligible, n is small)
- **Network:** Reduces unnecessary refetches during polling cycles

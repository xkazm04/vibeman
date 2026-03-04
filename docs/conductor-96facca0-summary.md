# Conductor Task: Reflection-completion cascade auto-refreshes UI

**Task ID:** `96facca0`
**Category:** functionality
**Effort:** 2/10
**Impact:** 3/10
**Risk:** null/10

## Problem Statement
When a Brain reflection completes, InsightsPanel and BrainEffectivenessWidget don't automatically refetch — users must manually refresh or wait for the next poll cycle. This creates a poor UX where fresh insights aren't immediately visible.

## Solution Implemented

### Architecture Overview
Implemented a lightweight event emitter pattern for reflection completion notifications:

1. **Event Emitter** (`reflectionCompletionEmitter`)
   - Singleton subscription system
   - Components subscribe to receive completion notifications
   - Automatic cleanup via unsubscribe functions

2. **Store Detection** (`brainStore`)
   - Detects when `lastReflection.completed_at` changes
   - Compares new vs previous reflection state
   - Emits completion events to all subscribers

3. **Component Subscriptions**
   - InsightsPanel
   - BrainEffectivenessWidget
   - OutcomesSummary

### Files Created
- `src/stores/reflectionCompletionEmitter.ts` - Event emitter singleton
- `tests/unit/stores/reflectionCompletionEmitter.test.ts` - Unit tests (7 tests)
- `tests/integration/brain-completion-cascade.test.ts` - Integration tests (5 tests)
- `docs/reflection-completion-cascade.md` - Architecture documentation

### Files Modified
- `src/stores/brainStore.ts`
  - Added import for `reflectionCompletionEmitter`
  - Updated `_fetchReflectionStatus()` to detect and emit completion events
  - Updated `fetchDashboard()` to detect and emit completion events

- `src/app/features/Brain/components/InsightsPanel.tsx`
  - Added subscription to completion events
  - Auto-refetches insights when reflection completes

- `src/app/features/Brain/components/BrainEffectivenessWidget.tsx`
  - Added subscription to completion events
  - Auto-refetches effectiveness scores when reflection completes

- `src/app/features/Brain/components/OutcomesSummary.tsx`
  - Added subscription to completion events
  - Auto-refetches outcomes when reflection completes

## Technical Details

### Completion Detection Logic
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

### Component Subscription Pattern
```typescript
useEffect(() => {
  const unsubscribe = subscribeToReflectionCompletion((reflectionId, projectId, scope) => {
    if (scope === 'project' && projectId === activeProject?.id) {
      refetchInsights();
    }
  });
  return unsubscribe; // Cleanup on unmount
}, [activeProject?.id, refetchInsights]);
```

## Benefits

1. **Instant feedback** - UI updates immediately after reflection completes
2. **No manual refresh** - Users don't need to click refresh buttons
3. **Efficient** - Only refetches when completion is detected, not on every poll
4. **Lightweight** - Simple Set-based event emitter (~60 LOC)
5. **Decoupled** - Components don't depend on polling schedules
6. **Testable** - Clean separation enables comprehensive unit/integration tests

## Testing

### Unit Tests (7 tests)
- Subscription and unsubscription
- Event emission to multiple listeners
- Listener isolation after unsubscribe
- Error handling in listeners
- Listener count tracking

### Integration Tests (5 tests)
- Completion event emission flow
- Project/scope filtering
- Multiple component subscriptions
- Cleanup on component unmount
- No events for running reflections

**All tests pass:** 12/12 ✓

## Migration Notes

**Before:**
- Components polled every 4-30 seconds
- Manual refresh required for immediate updates
- Polling even when no reflection was running

**After:**
- Components poll for reflection status (only when running)
- Completion triggers immediate cascade refresh
- No manual refresh needed

## Performance Impact

- **Memory:** O(n) where n = number of subscribed components (~3)
- **CPU:** O(n) per emission (negligible, n is small)
- **Network:** Reduces unnecessary refetches during idle polling cycles

## Related Documentation

- `docs/reflection-completion-cascade.md` - Full architecture guide
- `docs/polling-refactor.md` - Unified polling infrastructure
- `docs/use-reflection-trigger-hook.md` - Reflection trigger patterns

## Verification Steps

1. Start a reflection via InsightsPanel empty state
2. Monitor network tab - no excessive polling
3. When reflection completes:
   - InsightsPanel auto-updates with new insights
   - BrainEffectivenessWidget recomputes scores
   - OutcomesSummary refreshes statistics
4. No manual refresh button press needed

## Status
✅ **COMPLETE** - All tests passing, TypeScript clean, ready for production

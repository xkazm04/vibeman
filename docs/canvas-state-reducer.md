# Canvas State Reducer Implementation

## Overview
Replaced scattered ref-based state management in `EventCanvasD3.tsx` with a centralized `useReducer`-based state machine. This makes state transitions explicit, logged, and testable.

## Changes

### New Files
1. **`src/app/features/Brain/sub_MemoryCanvas/lib/canvasStateReducer.ts`**
   - Centralized state machine for canvas interaction
   - Discriminated union action types for type safety
   - Selector functions for derived state
   - Development logging for all state transitions

2. **`tests/unit/canvasStateReducer.test.ts`** (17 tests)
   - Unit tests for all reducer actions
   - Tests for selectors
   - Immutability verification

3. **`tests/integration/canvasState.test.ts`** (5 tests)
   - Integration tests for complex interaction flows
   - State transition scenarios

### Modified Files

#### `EventCanvasD3.tsx`
**Before:**
- 6+ individual refs: `transformRef`, `focusedGroupRef`, `selectedGroupRef`, `cursorRef`, `zoomCenterRef`, `momentumRef`
- State scattered across refs and React state
- Mutations spread across event handlers

**After:**
- Single `canvasState` from `useReducer`
- All state transitions via `dispatch(action)`
- Explicit action types: `ZoomChanged`, `GroupSelected`, `FocusEntered`, `FocusExited`, `EventSelected`, etc.

#### `useCanvasInteraction.ts`
**Before:**
- Received individual refs and setter functions as props
- Direct ref mutations in event handlers

**After:**
- Receives `canvasState` and `dispatch` function
- All state changes via dispatched actions
- Event handlers use `dispatch` instead of mutating refs

## State Structure

```typescript
interface CanvasState {
  transform: d3.ZoomTransform;      // Zoom/pan transform
  cursor: { x: number; y: number }; // Mouse position
  focusedGroupId: string | null;    // Active focus mode group
  selectedGroupId: string | null;   // Selected group in overview
  selectedEvent: BrainEvent | null; // Selected event
  zoomLevel: number;                // Current zoom level
  zoomCenter: { x: number; y: number }; // Zoom origin point
  momentum: number;                 // Scroll momentum
}
```

## Action Types

1. **`ZoomChanged`** - D3 zoom transform updated
2. **`CursorMoved`** - Mouse cursor position changed
3. **`GroupSelected`** - User selected a group (or null to clear)
4. **`FocusEntered`** - Entering focus mode for a group
5. **`FocusExited`** - Exiting focus mode
6. **`EventSelected`** - User clicked an event (or null to clear)
7. **`ZoomCenterSet`** - Mouse wheel zoom origin point
8. **`MomentumUpdated`** - Scroll momentum value changed
9. **`MomentumReset`** - Stop momentum scrolling
10. **`StateReset`** - Reset to initial state

## Benefits

### 1. **Explicit State Transitions**
All state changes are now explicit actions with clear intent:
```typescript
// Before: Direct mutation
focusedGroupRef.current = groupId;
setFocusedGroupId(groupId);
momentumRef.current = 0;

// After: Single action that encapsulates the transition
dispatch({ type: 'FocusEntered', groupId });
```

### 2. **Development Logging**
All state transitions are logged in development mode:
```
[CanvasState] FocusEntered { type: 'FocusEntered', groupId: 'group-1' }
[CanvasState] ZoomChanged { transform: {...}, zoomLevel: 2 }
```

### 3. **Testability**
Pure reducer function is trivial to test:
```typescript
const state = createInitialCanvasState();
const newState = canvasReducer(state, { type: 'FocusEntered', groupId: 'g1' });
expect(newState.focusedGroupId).toBe('g1');
```

### 4. **Type Safety**
Discriminated unions prevent invalid actions:
```typescript
// TypeScript error: 'groupId' is required for FocusEntered
dispatch({ type: 'FocusEntered' }); // ❌

// Valid
dispatch({ type: 'FocusEntered', groupId: 'g1' }); // ✅
```

### 5. **Consistent State Invariants**
Reducer enforces state invariants automatically:
- Entering focus mode clears group selection
- Exiting focus mode clears event selection
- Momentum is reset when changing modes

### 6. **Single Source of Truth**
Canvas state is now a single object instead of 6+ scattered refs, making it easier to:
- Debug state issues
- Understand current state at a glance
- Add new state fields without prop drilling

## Performance Notes

- **Momentum scrolling** still uses a local ref in the animation loop to avoid excessive dispatches per frame
- **Render triggers** are unchanged - state changes still trigger `requestRender()` as before
- **No re-render overhead** - reducer updates are efficient and only trigger re-renders when state actually changes

## Migration Path

The refactor was done incrementally:
1. Created reducer and actions
2. Added reducer to component
3. Updated event handlers to dispatch instead of mutating refs
4. Updated render logic to read from `canvasState`
5. Cleaned up unused refs
6. Added tests

This approach allowed for testing at each step without breaking functionality.

## Future Enhancements

Potential improvements now that state is centralized:

1. **Time-travel debugging** - Easy to implement with centralized state
2. **State persistence** - Could save/restore canvas state to localStorage
3. **Undo/redo** - State snapshots make this straightforward
4. **Analytics** - All user interactions are now explicit actions that can be tracked
5. **State validation** - Could add invariant checking in development mode

## Test Coverage

- **22 new tests** covering:
  - All reducer actions (17 unit tests)
  - Complex interaction flows (5 integration tests)
  - State immutability
  - Selector functions
  - State invariants

All canvas-related tests pass (28 total tests).

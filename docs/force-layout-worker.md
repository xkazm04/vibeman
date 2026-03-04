# D3 Force Layout Web Worker

## Overview

The D3 force layout computation for the Brain canvas has been offloaded to a dedicated Web Worker to prevent blocking the main thread during layout calculations.

## Problem

Previously, `runForceLayout()` executed 120 D3 force-simulation iterations synchronously on the main thread, blocking all rendering and user interaction during the computation. This created a noticeable freeze when:
- Loading new behavioral signals
- Switching between contexts
- Refreshing the canvas data

## Solution

The force simulation now runs in a dedicated Web Worker that:
1. Accepts event groups and configuration
2. Runs D3 simulation ticks in the background
3. Posts back positioned groups incrementally (every 10 ticks by default)
4. Allows the canvas to render partial layouts progressively

## Architecture

### Components

#### `forceLayout.worker.ts`
The Web Worker that executes D3 force simulation:
- **Input**: `WorkerInputMessage` containing groups and config
- **Output**: `WorkerOutputMessage` with progressive updates
- **Behavior**: Posts `'progress'` messages every N ticks and a `'complete'` message when done

#### `canvasLayout.ts`
Contains both synchronous and asynchronous layout functions:
- `runForceLayout()` - Legacy synchronous implementation (fallback)
- `runForceLayoutAsync()` - New worker-based async implementation

#### `canvasStore.ts`
Updated to use the worker and handle progressive rendering:
- Cancels any running worker when new layout is triggered
- Receives incremental updates and triggers re-renders
- Cleans up worker on component unmount

### Type Definitions

All worker message types are defined in `types.ts`:

```typescript
interface WorkerGroup {
  id: string;
  radius: number;
  x: number;
  y: number;
}

interface ForceLayoutConfig {
  width: number;
  height: number;
  totalTicks: number;
  progressInterval: number;
}

interface WorkerInputMessage {
  type: 'run';
  groups: WorkerGroup[];
  config: ForceLayoutConfig;
}

interface WorkerOutputMessage {
  type: 'progress' | 'complete';
  groups: WorkerGroup[];
  tick: number;
  totalTicks: number;
}
```

## Usage

The worker is automatically used when `CanvasStore.recalculateLayout()` is called in overview mode (non-focused):

```typescript
// In CanvasStore
this.workerCleanup = runForceLayoutAsync(
  this.groups,
  width,
  height,
  {
    onProgress: (groups, tick, totalTicks) => {
      // Progressive rendering: update groups and request redraw
      this.groups = groups;
      this.requestRender();
    },
    onComplete: (groups) => {
      // Final pass: pack events within groups
      this.groups = groups;
      this.groups.forEach(packEventsInGroup);
      this.requestRender();
      this.workerCleanup = null;
    },
    totalTicks: 120,
    progressInterval: 10, // Update every 10 ticks
  }
);
```

## Performance Benefits

### Before (Synchronous)
- **Main thread blocked**: 120 ticks × ~1-2ms = 120-240ms freeze
- **User experience**: Canvas freezes, interactions blocked
- **Visual feedback**: None until complete

### After (Worker-based)
- **Main thread**: Non-blocking, remains responsive
- **User experience**: Smooth interactions during layout
- **Visual feedback**: Progressive updates every 10 ticks (~20-40ms intervals)

## Progressive Rendering

The worker posts updates every `progressInterval` ticks:

```
Tick 0  → progress message (initial positions)
Tick 10 → progress message
Tick 20 → progress message
...
Tick 110 → progress message
Tick 119 → complete message (final positions)
```

This results in 13 total updates for 120 ticks with interval=10, giving users immediate visual feedback as the layout converges.

## Fallback Strategy

If the worker fails to initialize or encounters an error:
1. Error is logged to console
2. Falls back to synchronous `runForceLayout()`
3. Calls `onComplete()` callback
4. Worker is terminated

## Cleanup

The worker is properly cleaned up:
- **On new layout**: Previous worker is terminated before starting new one
- **On component unmount**: `store.destroy()` terminates any running worker
- **On completion**: Worker self-terminates after posting complete message

## Testing

Unit tests cover:
- Message structure validation
- Type safety for worker communication
- Callback contract verification
- Progress interval calculations

See `tests/unit/forceLayout.worker.test.ts` for details.

## Configuration

Default configuration:
- `totalTicks`: 120 (same as synchronous version)
- `progressInterval`: 10 (12 progress updates + 1 complete)

These can be adjusted in `CanvasStore.recalculateLayout()` if needed.

## Browser Support

Web Workers are supported in all modern browsers. Next.js webpack configuration automatically handles worker bundling via:

```typescript
new Worker(new URL('./forceLayout.worker.ts', import.meta.url), { type: 'module' })
```

## Future Improvements

Potential enhancements:
- Adaptive tick count based on group complexity
- Configurable progress intervals based on device performance
- Worker pooling for multiple concurrent layouts
- Incremental event packing within groups during layout

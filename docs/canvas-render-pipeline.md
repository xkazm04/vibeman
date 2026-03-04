# Canvas Render Pipeline

## Overview

The shared canvas render pipeline eliminates ~600 LOC of duplication across three canvas subsystems by extracting common rendering logic into composable, typed render passes.

## Architecture

### Core Components

**RenderContext** - Shared state passed to all render passes:
```typescript
interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  transform: { x: number; y: number; k: number };
  now: number;
  filterState?: FilterState;
}
```

**RenderPass** - Type-safe render stage:
```typescript
type RenderPassFn<TConfig> = (
  context: RenderContext,
  config: TConfig
) => void;
```

### Standard Render Passes

#### 1. Background Pass
- Radial gradient backgrounds
- Grid rendering (zoom-dependent)
- Configurable colors and opacity

#### 2. Event Dots Pass
- World/screen coordinate modes
- Recency pulse animations
- Glow/shadow effects for high-weight events
- Optional radial gradients
- White core highlights

#### 3. Event Cards Pass
- Zoom-dependent card rendering
- Context/summary display modes
- Weight bars
- Configurable card dimensions

#### 4. Connection Lines Pass
- Sequential mode (sorted timeline connections)
- Grouped mode (by type + context)
- Configurable colors and opacity

#### 5. Smart Labels Pass
- Collision-aware label placement
- Zoom-based filtering
- Priority-based selection
- Configurable font sizes

#### 6. Overlay Pass
- Vignette edges (top/bottom/left/right)
- Frosted headers
- Hint messages

## Usage

### Basic Example

```typescript
import { executeRenderPipeline, type RenderContext } from '@/app/features/Brain/sub_MemoryCanvas/lib/canvasRenderPipeline';

const context: RenderContext = {
  ctx,
  width,
  height,
  dpr,
  transform,
  now: Date.now(),
  filterState,
};

executeRenderPipeline(context, {
  background: {
    gradient: { from: '#141418', to: '#0a0a0c' },
    gridOpacity: 0.06,
  },
  eventDots: {
    events: myEvents,
    coordinateMode: 'world',
    enablePulse: true,
  },
  smartLabels: {
    events: myEvents,
    coordinateMode: 'world',
    maxLabels: 12,
  },
  overlay: {
    vignette: { top: 50, bottom: 50 },
  },
});
```

### Timeline Extension

For timeline-specific needs, use the timeline render pipeline extension:

```typescript
import { executeTimelineRenderPipeline } from '@/app/features/Brain/sub_Timeline/timelineRenderPipeline';

executeTimelineRenderPipeline(context, {
  laneBackground: {
    laneTypes: SIGNAL_TYPES,
    laneLabels: LANE_LABELS,
    visibleTypes: visible,
    margin: TIMELINE_MARGIN,
  },
  timeAxis: {
    margin: TIMELINE_MARGIN,
    dayCount: 7,
  },
  timelineGrid: {
    laneCount: 4,
    dayCount: 7,
    margin: TIMELINE_MARGIN,
  },
  eventDots: {
    events: visibleEvents,
    coordinateMode: 'world',
    useGradients: true,
  },
});
```

## Coordinate Modes

### World Coordinates
- Events positioned in data space
- Pipeline applies zoom/pan transform
- Used in: overview bubbles, focused timeline

### Screen Coordinates
- Events positioned in screen space
- Caller manages transforms before pipeline
- Used in: focused view with pre-transformed events

## Benefits

### Code Reduction
- **Before**: ~600 LOC duplicated across 3 files
- **After**: ~600 LOC shared pipeline + ~200 LOC per subsystem
- **Net Savings**: ~1200 LOC

### Maintainability
- Single source of truth for rendering logic
- Type-safe configuration
- Easier to add new render passes
- Consistent behavior across subsystems

### Performance
- Shared pulse phase calculation (one per frame vs. per event)
- Cached OffscreenCanvas for lane backgrounds
- Efficient collision-aware label placement

## Files Modified

### Core Pipeline
- `src/app/features/Brain/sub_MemoryCanvas/lib/canvasRenderPipeline.ts` (new)
- `src/app/features/Brain/sub_Timeline/timelineRenderPipeline.ts` (new)

### Refactored Subsystems
- `src/app/features/Brain/sub_MemoryCanvas/lib/renderFocused.ts`
- `src/app/features/Brain/sub_MemoryCanvas/lib/renderOverview.ts`
- `src/app/features/Brain/sub_Timeline/EventCanvasTimeline.tsx`

### Tests
- `tests/unit/canvasRenderPipeline.test.ts` (new, 18 tests)

## Testing

Run tests:
```bash
npm run test -- tests/unit/canvasRenderPipeline.test.ts
```

## Future Extensions

Potential new render passes:
- Minimap overlay
- Density heatmap
- Path tracing (bezier curves between events)
- Zoom indicators
- Selection highlights

import * as d3 from 'd3';
import type { SignalType, BrainEvent, Group, SpatialIndex, WorkerGroup, ForceLayoutConfig, WorkerOutputMessage } from './types';
import { COLORS, BUBBLE_SCALE, BUBBLE_PADDING, GOLDEN_ANGLE, LANE_TYPES } from './constants';
import { getEventRadius } from './helpers';

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function buildSpatialIndex(events: BrainEvent[], cellSize: number = 30): SpatialIndex {
  const cells = new Map<string, BrainEvent[]>();
  for (const evt of events) {
    const cx = Math.floor(evt.x / cellSize);
    const cy = Math.floor(evt.y / cellSize);
    const key = cellKey(cx, cy);
    const bucket = cells.get(key);
    if (bucket) bucket.push(evt);
    else cells.set(key, [evt]);
  }
  return { cellSize, cells };
}

export function queryNearest(
  index: SpatialIndex,
  x: number,
  y: number,
  maxDistSq: number,
): BrainEvent | null {
  const cx = Math.floor(x / index.cellSize);
  const cy = Math.floor(y / index.cellSize);
  let closest: BrainEvent | null = null;
  let closestDist = maxDistSq;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = index.cells.get(cellKey(cx + dx, cy + dy));
      if (!bucket) continue;
      for (const evt of bucket) {
        const ex = evt.x - x;
        const ey = evt.y - y;
        const dist = ex * ex + ey * ey;
        if (dist < closestDist) { closestDist = dist; closest = evt; }
      }
    }
  }
  return closest;
}

export function formGroups(events: BrainEvent[]): Group[] {
  const map = new Map<string, BrainEvent[]>();
  for (const evt of events) {
    if (!map.has(evt.context_name)) map.set(evt.context_name, []);
    map.get(evt.context_name)!.push(evt);
  }

  return Array.from(map.entries()).map(([name, evts]) => {
    const typeCounts: Record<string, number> = {};
    for (const e of evts) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    }
    const dominantType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as SignalType;

    const sortedEvents = [...evts].sort((a, b) => a.timestamp - b.timestamp);

    return {
      id: evts[0].context_id,
      name,
      events: evts,
      sortedEvents,
      radius: Math.sqrt(evts.length) * BUBBLE_SCALE,
      x: 0,
      y: 0,
      dominantType,
      dominantColor: COLORS[dominantType],
    };
  });
}

/**
 * Synchronous force layout (legacy fallback).
 * Use runForceLayoutAsync() for non-blocking worker-based layout.
 */
export function runForceLayout(groups: Group[], width: number, height: number): void {
  const angleStep = (2 * Math.PI) / groups.length;
  const initRadius = Math.min(width, height) * 0.25;
  groups.forEach((g, i) => {
    g.x = width / 2 + initRadius * Math.cos(i * angleStep);
    g.y = height / 2 + initRadius * Math.sin(i * angleStep);
  });

  const simulation = d3.forceSimulation(groups as d3.SimulationNodeDatum[])
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide<d3.SimulationNodeDatum>((d: any) => d.radius + BUBBLE_PADDING).strength(0.85).iterations(3))
    .force('charge', d3.forceManyBody().strength(-250))
    .force('x', d3.forceX(width / 2).strength(0.04))
    .force('y', d3.forceY(height / 2).strength(0.04))
    .stop();

  for (let i = 0; i < 120; i++) {
    simulation.tick();
  }

  groups.forEach((g: any) => {
    g.x = g.x ?? width / 2;
    g.y = g.y ?? height / 2;
  });
}

/**
 * Worker-based async force layout.
 * Posts incremental updates via onProgress callback for smooth rendering.
 */
export function runForceLayoutAsync(
  groups: Group[],
  width: number,
  height: number,
  options: {
    onProgress?: (groups: Group[], tick: number, totalTicks: number) => void;
    onComplete?: (groups: Group[]) => void;
    totalTicks?: number;
    progressInterval?: number;
  } = {}
): () => void {
  const { onProgress, onComplete, totalTicks = 120, progressInterval = 10 } = options;

  // Create worker from module
  const worker = new Worker(
    new URL('./forceLayout.worker.ts', import.meta.url),
    { type: 'module' }
  );

  // Prepare minimal data for worker
  const workerGroups: WorkerGroup[] = groups.map(g => ({
    id: g.id,
    radius: g.radius,
    x: g.x,
    y: g.y,
  }));

  const config: ForceLayoutConfig = {
    width,
    height,
    totalTicks,
    progressInterval,
  };

  worker.onmessage = (e: MessageEvent<WorkerOutputMessage>) => {
    const { type, groups: layoutGroups, tick, totalTicks: total } = e.data;

    // Apply positions back to original groups
    layoutGroups.forEach(wg => {
      const group = groups.find(g => g.id === wg.id);
      if (group) {
        group.x = wg.x;
        group.y = wg.y;
      }
    });

    if (type === 'progress' && onProgress) {
      onProgress(groups, tick, total);
    } else if (type === 'complete') {
      onComplete?.(groups);
      worker.terminate();
    }
  };

  worker.onerror = (err) => {
    console.error('Force layout worker error:', err);
    // Fallback to sync layout on worker failure
    runForceLayout(groups, width, height);
    onComplete?.(groups);
    worker.terminate();
  };

  // Start the worker
  worker.postMessage({ type: 'run', groups: workerGroups, config });

  // Return cleanup function
  return () => worker.terminate();
}

export function packEventsInGroup(group: Group): void {
  const { events, x: cx, y: cy, radius } = group;
  if (events.length === 0) return;
  if (events.length === 1) {
    events[0].x = cx; events[0].y = cy;
    group.spatialIndex = buildSpatialIndex(events);
    return;
  }

  // Phase 1: Golden-angle spiral seeding
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  sorted.forEach((evt, i) => {
    const r = radius * 0.75 * Math.sqrt((i + 1) / sorted.length);
    const theta = i * GOLDEN_ANGLE;
    evt.x = cx + r * Math.cos(theta);
    evt.y = cy + r * Math.sin(theta);
  });

  // Phase 2: Spatial-grid collision resolution (replaces O(n²) pairwise scan)
  // Max possible event radius: DOT_RADIUS_MAX(14) * recencyBoost(1.3) ≈ 18.2
  // Cell size = 2 * maxRadius + gap so neighbors cover all possible collisions
  const GRID_CELL = 40;
  const maxBoundary = radius * 0.85;
  const MAX_PASSES = 8;
  const EARLY_EXIT_THRESHOLD = 0.5; // px — stop when displacements are negligible

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    // Build collision grid for this pass
    const grid = new Map<string, BrainEvent[]>();
    for (const evt of events) {
      const gx = Math.floor(evt.x / GRID_CELL);
      const gy = Math.floor(evt.y / GRID_CELL);
      const key = cellKey(gx, gy);
      const bucket = grid.get(key);
      if (bucket) bucket.push(evt);
      else grid.set(key, [evt]);
    }

    let maxDisplacement = 0;

    // Check each event against neighbors in surrounding cells
    for (const evt of events) {
      const gx = Math.floor(evt.x / GRID_CELL);
      const gy = Math.floor(evt.y / GRID_CELL);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const bucket = grid.get(cellKey(gx + dx, gy + dy));
          if (!bucket) continue;

          for (const other of bucket) {
            if (other === evt) continue;
            const ddx = other.x - evt.x;
            const ddy = other.y - evt.y;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            const minDist = getEventRadius(evt.weight, evt.timestamp) + getEventRadius(other.weight, other.timestamp) + 2;

            if (dist < minDist && dist > 0) {
              const overlap = (minDist - dist) / 2;
              const nx = ddx / dist;
              const ny = ddy / dist;

              // Only push the current event (other will be pushed when it's the current)
              evt.x -= nx * overlap;
              evt.y -= ny * overlap;
              maxDisplacement = Math.max(maxDisplacement, overlap);
            }
          }
        }
      }

      // Clamp to group radius boundary
      const ex = evt.x - cx;
      const ey = evt.y - cy;
      const eDist = Math.sqrt(ex * ex + ey * ey);
      if (eDist > maxBoundary) {
        evt.x = cx + (ex / eDist) * maxBoundary;
        evt.y = cy + (ey / eDist) * maxBoundary;
      }
    }

    // Early exit when settled
    if (maxDisplacement < EARLY_EXIT_THRESHOLD) break;
  }

  group.spatialIndex = buildSpatialIndex(events);
}

/**
 * Shared lane-based collision resolution.
 * Used by both layoutFocusedGroup and EventCanvasTimeline's positionEvents.
 */
export interface LaneCollisionParams {
  /** All events to resolve (already positioned with initial x/y) */
  events: BrainEvent[];
  /** Lane types in order */
  laneTypes: SignalType[];
  /** Per-lane bounds: callback from lane index to { top, bottom } */
  laneBounds: (laneIdx: number) => { top: number; bottom: number };
  /** Number of collision passes (default: 6) */
  passes?: number;
  /** Sliding window size for neighbor checks (default: 8) */
  windowSize?: number;
  /** X nudge ratio (default: 0.2) */
  xRatio?: number;
  /** Y nudge ratio (default: 0.8) */
  yRatio?: number;
}

export function resolveLaneCollisions(params: LaneCollisionParams): void {
  const {
    events,
    laneTypes,
    laneBounds,
    passes = 6,
    windowSize = 8,
    xRatio = 0.2,
    yRatio = 0.8,
  } = params;

  for (let li = 0; li < laneTypes.length; li++) {
    const laneType = laneTypes[li];
    const laneEvents = events.filter(e => e.type === laneType);
    if (laneEvents.length < 2) continue;

    laneEvents.sort((a, b) => a.x - b.x);

    const { top: laneTop, bottom: laneBot } = laneBounds(li);

    for (let pass = 0; pass < passes; pass++) {
      for (let i = 0; i < laneEvents.length; i++) {
        const curr = laneEvents[i];
        const windowEnd = Math.min(laneEvents.length, i + windowSize);
        for (let j = i + 1; j < windowEnd; j++) {
          const other = laneEvents[j];
          const minDist = getEventRadius(curr.weight, curr.timestamp) + getEventRadius(other.weight, other.timestamp) + 2;
          const dx = other.x - curr.x;
          const dy = other.y - curr.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist && dist > 0.001) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy === 0 ? 1 : dy / Math.abs(dy);

            curr.x -= overlap * nx * xRatio;
            curr.y -= overlap * ny * yRatio;
            other.x += overlap * nx * xRatio;
            other.y += overlap * ny * yRatio;

            curr.y = Math.max(laneTop, Math.min(laneBot, curr.y));
            other.y = Math.max(laneTop, Math.min(laneBot, other.y));
          }
        }
      }
    }
  }
}

export function layoutFocusedGroup(group: Group, width: number, height: number): void {
  const events = group.events;
  if (events.length === 0) return;

  if (events.length === 1) {
    events[0].x = width / 2;
    events[0].y = height / 2;
    group.spatialIndex = buildSpatialIndex(events);
    return;
  }

  const minTs = Math.min(...events.map(e => e.timestamp));
  const maxTs = Math.max(...events.map(e => e.timestamp));
  const span = Math.max(maxTs - minTs, 3600000);
  const padSpan = span * 0.05;

  const xPad = width * 0.10;
  const xRange = width - xPad * 2;

  const yTop = height * 0.06;
  const yBottom = height * 0.08;
  const laneHeight = (height - yTop - yBottom) / LANE_TYPES.length;

  for (const evt of events) {
    const t = (evt.timestamp - minTs + padSpan) / (span + padSpan * 2);
    evt.x = xPad + t * xRange;
    const laneIdx = LANE_TYPES.indexOf(evt.type);
    const laneCenterY = yTop + laneIdx * laneHeight + laneHeight / 2;
    const jitter = (evt.weight - 1.0) * laneHeight * 0.15;
    evt.y = laneCenterY + jitter;
  }

  resolveLaneCollisions({
    events,
    laneTypes: LANE_TYPES,
    laneBounds: (li) => ({
      top: yTop + li * laneHeight + laneHeight * 0.15,
      bottom: yTop + (li + 1) * laneHeight - laneHeight * 0.15,
    }),
  });

  group.spatialIndex = buildSpatialIndex(events);
}

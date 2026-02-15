import * as d3 from 'd3';
import type { SignalType, BrainEvent, Group } from './types';
import { COLORS, BUBBLE_SCALE, BUBBLE_PADDING, GOLDEN_ANGLE, LANE_TYPES } from './constants';
import { getEventRadius } from './helpers';

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

    return {
      id: evts[0].context_id,
      name,
      events: evts,
      radius: Math.sqrt(evts.length) * BUBBLE_SCALE,
      x: 0,
      y: 0,
      dominantType,
      dominantColor: COLORS[dominantType],
    };
  });
}

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

export function packEventsInGroup(group: Group): void {
  const { events, x: cx, y: cy, radius } = group;
  if (events.length === 0) return;
  if (events.length === 1) { events[0].x = cx; events[0].y = cy; return; }

  // Phase 1: Golden-angle spiral seeding
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  sorted.forEach((evt, i) => {
    const r = radius * 0.75 * Math.sqrt((i + 1) / sorted.length);
    const theta = i * GOLDEN_ANGLE;
    evt.x = cx + r * Math.cos(theta);
    evt.y = cy + r * Math.sin(theta);
  });

  // Phase 2: 8-pass iterative pairwise repulsion
  const maxBoundary = radius * 0.85;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = getEventRadius(a.weight, a.timestamp) + getEventRadius(b.weight, b.timestamp) + 2;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Clamp both to group radius boundary
          for (const evt of [a, b]) {
            const ex = evt.x - cx;
            const ey = evt.y - cy;
            const eDist = Math.sqrt(ex * ex + ey * ey);
            if (eDist > maxBoundary) {
              evt.x = cx + (ex / eDist) * maxBoundary;
              evt.y = cy + (ey / eDist) * maxBoundary;
            }
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

  // Multi-pass 2D collision resolution with radius-aware distances
  for (let li = 0; li < LANE_TYPES.length; li++) {
    const laneType = LANE_TYPES[li];
    const laneEvents = events.filter(e => e.type === laneType);
    if (laneEvents.length < 2) continue;

    laneEvents.sort((a, b) => a.x - b.x);

    const laneTop = yTop + li * laneHeight + laneHeight * 0.15;
    const laneBot = yTop + (li + 1) * laneHeight - laneHeight * 0.15;

    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < laneEvents.length; i++) {
        const curr = laneEvents[i];
        const windowEnd = Math.min(laneEvents.length, i + 8);
        for (let j = i + 1; j < windowEnd; j++) {
          const other = laneEvents[j];
          const minDist = getEventRadius(curr.weight, curr.timestamp) + getEventRadius(other.weight, other.timestamp) + 2;
          const dx = other.x - curr.x;
          const dy = other.y - curr.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            // 80% Y nudge, 20% X nudge
            const nx = dx / dist;
            const ny = dy / dist;
            const yNudge = overlap * 0.8 / 2;
            const xNudge = overlap * 0.2 / 2;

            curr.y -= ny * yNudge;
            other.y += ny * yNudge;
            curr.x -= nx * xNudge;
            other.x += nx * xNudge;

            // Clamp Y to lane bounds
            curr.y = Math.max(laneTop, Math.min(laneBot, curr.y));
            other.y = Math.max(laneTop, Math.min(laneBot, other.y));
          }
        }
      }
    }
  }
}

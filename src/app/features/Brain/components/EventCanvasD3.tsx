'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Trash2, Undo2, ArrowLeft, X } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type SignalType = 'git_activity' | 'api_focus' | 'context_focus' | 'implementation';

interface BrainEvent {
  id: string;
  type: SignalType;
  context_id: string;
  context_name: string;
  timestamp: number;
  weight: number;
  summary: string;
  x: number;
  y: number;
}

interface Group {
  id: string;
  name: string;
  events: BrainEvent[];
  radius: number;
  x: number;
  y: number;
  dominantType: SignalType;
  dominantColor: string;
}

interface UndoEntry {
  event: BrainEvent;
  timeout: ReturnType<typeof setTimeout>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLORS: Record<SignalType, string> = {
  git_activity: '#10b981',
  api_focus: '#3b82f6',
  context_focus: '#a855f7',
  implementation: '#f59e0b',
};

const LABELS: Record<SignalType, string> = {
  git_activity: 'Git',
  api_focus: 'API',
  context_focus: 'Context',
  implementation: 'Impl',
};

const CONTEXT_NAMES = [
  'Auth Module', 'Payment Gateway', 'User Dashboard', 'API Layer',
  'Data Pipeline', 'Search Engine', 'Notification System', 'File Storage',
  'Analytics Engine', 'Config Service',
];

const SUMMARIES: Record<SignalType, string[]> = {
  git_activity: ['Committed refactor', 'Merged feature', 'Fixed conflicts', 'Pushed hotfix', 'Tagged release', 'Rebased branch'],
  api_focus: ['Optimized endpoint', 'Added rate limit', 'Fixed CORS', 'Cached queries', 'Added versioning', 'Updated docs'],
  context_focus: ['Analyzed deps', 'Mapped relations', 'Scanned debt', 'Reviewed arch', 'Updated bounds', 'Audited exports'],
  implementation: ['Built feature', 'Created hook', 'Added dark mode', 'Refactored state', 'Built drag-drop', 'Added shortcuts'],
};

const BG = '#0f0f11';
const BUBBLE_SCALE = 28;
const BUBBLE_PADDING = 20;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FOCUS_ZOOM_THRESHOLD = 1.8;

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getEventAlpha(timestamp: number): number {
  const ageHours = (Date.now() - timestamp) / 3600000;
  if (ageHours < 24) return 1.0;
  if (ageHours < 72) return 0.75;
  if (ageHours < 168) return 0.50;
  return 0.30;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Mock Data (100 events, ~10 groups) ─────────────────────────────────────

function generateEvents(): BrainEvent[] {
  const now = Date.now();
  const span = 14 * 24 * 60 * 60 * 1000;
  const start = now - span;
  const events: BrainEvent[] = [];
  let seed = 314159;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const SIGNAL_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

  const groupWeights = CONTEXT_NAMES.map(() => 0.3 + rand() * 1.7);
  const totalWeight = groupWeights.reduce((a, b) => a + b, 0);
  const groupCounts = groupWeights.map(w => Math.max(3, Math.round((w / totalWeight) * 100)));

  let eventId = 0;
  for (let gi = 0; gi < CONTEXT_NAMES.length; gi++) {
    const count = groupCounts[gi];
    for (let i = 0; i < count; i++) {
      const type = SIGNAL_TYPES[Math.floor(rand() * 4)];
      const sums = SUMMARIES[type];
      const ageBias = rand() < 0.4 ? rand() * 0.15 : rand();
      const ts = start + ageBias * span;

      events.push({
        id: `ev-${eventId++}`,
        type,
        context_id: `ctx-${gi}`,
        context_name: CONTEXT_NAMES[gi],
        timestamp: Math.min(ts, now),
        weight: 0.2 + rand() * 1.8,
        summary: sums[Math.floor(rand() * sums.length)],
        x: 0,
        y: 0,
      });
    }
  }
  return events;
}

// ─── Group Formation ────────────────────────────────────────────────────────

function formGroups(events: BrainEvent[]): Group[] {
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

// ─── Force Layout ───────────────────────────────────────────────────────────

function runForceLayout(groups: Group[], width: number, height: number): void {
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

// ─── Intra-Group Packing ────────────────────────────────────────────────────

function packEventsInGroup(group: Group): void {
  const { events, x: cx, y: cy, radius } = group;
  if (events.length === 0) return;
  if (events.length === 1) { events[0].x = cx; events[0].y = cy; return; }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  sorted.forEach((evt, i) => {
    const r = radius * 0.75 * Math.sqrt((i + 1) / sorted.length);
    const theta = i * GOLDEN_ANGLE;
    evt.x = cx + r * Math.cos(theta);
    evt.y = cy + r * Math.sin(theta);
  });
}

// ─── Focused Group Layout (Timeline) ────────────────────────────────────────

const LANE_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

function layoutFocusedGroup(group: Group, width: number, height: number): void {
  const events = group.events;
  if (events.length === 0) return;

  if (events.length === 1) {
    events[0].x = width / 2;
    events[0].y = height / 2;
    return;
  }

  // Time range
  const minTs = Math.min(...events.map(e => e.timestamp));
  const maxTs = Math.max(...events.map(e => e.timestamp));
  const span = Math.max(maxTs - minTs, 3600000); // at least 1 hour
  const padSpan = span * 0.05;

  // X scale: time → horizontal position (generous padding for breathing room)
  const xPad = width * 0.10;
  const xRange = width - xPad * 2;

  // Y lanes by signal type (minimal padding for tall lanes)
  const yTop = height * 0.06;
  const yBottom = height * 0.08;
  const laneHeight = (height - yTop - yBottom) / LANE_TYPES.length;

  // Initial placement: x from timestamp, y from lane center + weight jitter
  for (const evt of events) {
    const t = (evt.timestamp - minTs + padSpan) / (span + padSpan * 2);
    evt.x = xPad + t * xRange;
    const laneIdx = LANE_TYPES.indexOf(evt.type);
    const laneCenterY = yTop + laneIdx * laneHeight + laneHeight / 2;
    const jitter = (evt.weight - 1.0) * laneHeight * 0.15;
    evt.y = laneCenterY + jitter;
  }

  // Collision resolution: nudge overlapping events apart within lane bounds
  const MIN_DIST_X = 28; // minimum horizontal pixel distance to consider overlap
  const MIN_DIST_Y = 22; // minimum vertical separation to enforce

  for (let li = 0; li < LANE_TYPES.length; li++) {
    const laneType = LANE_TYPES[li];
    const laneEvents = events.filter(e => e.type === laneType);
    if (laneEvents.length < 2) continue;

    // Sort by x so we only check neighbors
    laneEvents.sort((a, b) => a.x - b.x);

    const laneTop = yTop + li * laneHeight + laneHeight * 0.15;
    const laneBot = yTop + (li + 1) * laneHeight - laneHeight * 0.15;

    for (let i = 1; i < laneEvents.length; i++) {
      const curr = laneEvents[i];

      // Check against recent neighbors (up to 5 back) for x-proximity
      for (let j = Math.max(0, i - 5); j < i; j++) {
        const prev = laneEvents[j];
        const dx = Math.abs(curr.x - prev.x);
        if (dx > MIN_DIST_X) continue; // far enough in x, no collision

        const dy = Math.abs(curr.y - prev.y);
        if (dy >= MIN_DIST_Y) continue; // already separated in y

        // Nudge current event away from prev
        const nudge = MIN_DIST_Y - dy + 2;
        if (curr.y >= prev.y) {
          curr.y = Math.min(laneBot, curr.y + nudge);
        } else {
          curr.y = Math.max(laneTop, curr.y - nudge);
        }
      }
    }
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EventCanvasD3() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const dimRef = useRef({ width: 800, height: 500 });
  const animRef = useRef<number>(0);
  const groupsRef = useRef<Group[]>([]);
  const cursorRef = useRef({ x: 0, y: 0 }); // screen coords
  const focusedGroupRef = useRef<string | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const momentumRef = useRef(0);
  const momentumAnimRef = useRef<number>(0);
  const zoomCenterRef = useRef({ x: 0, y: 0 }); // screen coords for momentum zoom center

  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<BrainEvent | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [events, setEvents] = useState<BrainEvent[]>(() => generateEvents());
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroupRef = useRef<string | null>(null);

  // Compute groups whenever events change
  const groups = useMemo(() => {
    const g = formGroups(events);
    const { width, height } = dimRef.current;
    if (width > 0 && height > 0) {
      runForceLayout(g, width, height);
      g.forEach(packEventsInGroup);
    }
    groupsRef.current = g;
    return g;
  }, [events]);

  const focusedGroup = useMemo(() => {
    if (!focusedGroupId) return null;
    return groups.find(g => g.id === focusedGroupId) || null;
  }, [focusedGroupId, groups]);

  // ─── Find group under cursor ──────────────────────────────────────────────

  const findGroupAtCursor = useCallback((): Group | null => {
    const t = transformRef.current;
    const { x: sx, y: sy } = cursorRef.current;
    const dataX = (sx - t.x) / t.k;
    const dataY = (sy - t.y) / t.k;

    for (const group of groupsRef.current) {
      const dx = dataX - group.x;
      const dy = dataY - group.y;
      if (dx * dx + dy * dy <= group.radius * group.radius) {
        return group;
      }
    }
    return null;
  }, []);

  // ─── Enter/Exit Focus ─────────────────────────────────────────────────────

  const enterFocus = useCallback((group: Group) => {
    // Kill any active momentum
    momentumRef.current = 0;
    if (momentumAnimRef.current) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = 0; }

    const { width, height } = dimRef.current;
    focusedGroupRef.current = group.id;
    setFocusedGroupId(group.id);

    // Layout events for focused view
    layoutFocusedGroup(group, width, height);

    // Zoom out slightly for comfortable timeline overview
    const canvas = canvasRef.current;
    if (canvas && zoomBehaviorRef.current) {
      const sel = d3.select(canvas);
      const initK = 0.88;
      const tx = width * (1 - initK) / 2;
      const ty = height * (1 - initK) / 2;
      (sel as any).transition().duration(400).call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(initK)
      );
    }
  }, []);

  const exitFocus = useCallback(() => {
    // Kill any active momentum
    momentumRef.current = 0;
    if (momentumAnimRef.current) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = 0; }

    focusedGroupRef.current = null;
    setFocusedGroupId(null);
    setSelectedEvent(null);

    // Re-pack events back into their group positions
    const currentGroups = groupsRef.current;
    currentGroups.forEach(packEventsInGroup);

    // Fit to view after exiting
    const canvas = canvasRef.current;
    if (canvas && zoomBehaviorRef.current) {
      const { width, height } = dimRef.current;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const g of currentGroups) {
        minX = Math.min(minX, g.x - g.radius);
        minY = Math.min(minY, g.y - g.radius);
        maxX = Math.max(maxX, g.x + g.radius);
        maxY = Math.max(maxY, g.y + g.radius);
      }
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;
      if (bboxW > 0 && bboxH > 0) {
        const scale = Math.min(width * 0.84 / bboxW, height * 0.84 / bboxH, 2.0);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const tx = width / 2 - cx * scale;
        const ty = height / 2 - cy * scale;
        const sel = d3.select(canvas);
        (sel as any).transition().duration(500).call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimRef.current;
    const dpr = window.devicePixelRatio || 1;
    const transform = transformRef.current;
    const k = transform.k;
    const currentGroups = groupsRef.current;
    const currentFocusId = focusedGroupRef.current;

    // Clear with radial gradient background
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
    bgGrad.addColorStop(0, '#141418');
    bgGrad.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid pattern (overview only)
    if (!currentFocusId && k > 0.4) {
      ctx.strokeStyle = 'rgba(63,63,70,0.06)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const ox = transform.x % (gridSize * k);
      const oy = transform.y % (gridSize * k);
      for (let gx = ox; gx < width; gx += gridSize * k) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      for (let gy = oy; gy < height; gy += gridSize * k) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }
    }

    // ── FOCUSED MODE (Timeline) ──
    if (currentFocusId) {
      const fg = currentGroups.find(g => g.id === currentFocusId);
      if (!fg) return;

      const yTop = height * 0.06;
      const yBottom = height * 0.08;
      const laneHeight = (height - yTop - yBottom) / LANE_TYPES.length;
      const xPad = width * 0.10;
      const xRange = width - xPad * 2;

      // ── Lane backgrounds with type-colored gradients ──
      for (let i = 0; i < LANE_TYPES.length; i++) {
        const laneY = yTop + i * laneHeight;
        const laneColor = COLORS[LANE_TYPES[i]];

        // Gradient lane background
        const laneGrad = ctx.createLinearGradient(0, laneY, 0, laneY + laneHeight);
        laneGrad.addColorStop(0, hexToRgba(laneColor, 0.03));
        laneGrad.addColorStop(0.5, hexToRgba(laneColor, 0.06));
        laneGrad.addColorStop(1, hexToRgba(laneColor, 0.02));
        ctx.fillStyle = laneGrad;
        ctx.fillRect(0, laneY, width, laneHeight);

        // Lane separator
        ctx.strokeStyle = hexToRgba(laneColor, 0.15);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, laneY);
        ctx.lineTo(width, laneY);
        ctx.stroke();

        // Centered watermark-style lane type name
        ctx.fillStyle = hexToRgba(laneColor, 0.08);
        ctx.font = `bold ${Math.min(laneHeight * 0.35, 48)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(LABELS[LANE_TYPES[i]].toUpperCase(), width / 2, laneY + laneHeight / 2);

        // Small lane label at left edge
        ctx.fillStyle = hexToRgba(laneColor, 0.6);
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(LABELS[LANE_TYPES[i]], 10, laneY + 6);
      }

      // Bottom lane separator
      ctx.strokeStyle = 'rgba(63,63,70,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, yTop + LANE_TYPES.length * laneHeight);
      ctx.lineTo(width, yTop + LANE_TYPES.length * laneHeight);
      ctx.stroke();

      // Time axis (weekly units) — follows horizontal pan/zoom
      if (fg.events.length > 0) {
        const minTs = Math.min(...fg.events.map(e => e.timestamp));
        const maxTs = Math.max(...fg.events.map(e => e.timestamp));
        const span = Math.max(maxTs - minTs, 3600000);
        const padSpan = span * 0.05;
        const axisY = height - yBottom + 16;

        // Axis line (transformed horizontally)
        const axisStartX = xPad * k + transform.x;
        const axisEndX = (xPad + xRange) * k + transform.x;
        ctx.strokeStyle = 'rgba(63,63,70,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(axisStartX, axisY);
        ctx.lineTo(axisEndX, axisY);
        ctx.stroke();

        // Week boundaries
        const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const firstMonday = (() => {
          const d = new Date(minTs - padSpan);
          d.setHours(0, 0, 0, 0);
          const dayOfWeek = d.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          d.setDate(d.getDate() + daysToMonday);
          return d.getTime();
        })();

        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const totalSpan = span + padSpan * 2;
        let weekStart = firstMonday;
        while (weekStart <= maxTs + padSpan + WEEK_MS) {
          const frac = (weekStart - minTs + padSpan) / totalSpan;
          const dataX = xPad + frac * xRange;
          const screenGridX = dataX * k + transform.x;

          // Only draw if visible on screen
          if (screenGridX > -20 && screenGridX < width + 20) {
            // Vertical grid line at week boundary
            ctx.strokeStyle = 'rgba(63,63,70,0.2)';
            ctx.beginPath();
            ctx.moveTo(screenGridX, yTop);
            ctx.lineTo(screenGridX, yTop + LANE_TYPES.length * laneHeight);
            ctx.stroke();

            // Tick mark
            ctx.strokeStyle = 'rgba(63,63,70,0.8)';
            ctx.beginPath();
            ctx.moveTo(screenGridX, axisY);
            ctx.lineTo(screenGridX, axisY + 5);
            ctx.stroke();

            // Week label
            const weekDate = new Date(weekStart);
            const label = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            ctx.fillStyle = '#a1a1aa';
            ctx.fillText(label, screenGridX, axisY + 8);

            // Week number
            const weekNum = Math.ceil(((weekStart - new Date(weekDate.getFullYear(), 0, 1).getTime()) / WEEK_MS)) + 1;
            ctx.fillStyle = 'rgba(113,113,122,0.5)';
            ctx.font = '8px Inter, system-ui, sans-serif';
            ctx.fillText(`W${weekNum}`, screenGridX, axisY + 20);
            ctx.font = '9px Inter, system-ui, sans-serif';
          }
          weekStart += WEEK_MS;
        }
      }

      // ── Connection lines between sequential events ──
      const sorted = [...fg.events].sort((a, b) => a.timestamp - b.timestamp);
      ctx.strokeStyle = hexToRgba(fg.dominantColor, 0.08);
      ctx.lineWidth = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.type === curr.type) {
          const px = prev.x * k + transform.x;
          const cx2 = curr.x * k + transform.x;
          ctx.beginPath();
          ctx.moveTo(px, prev.y);
          ctx.lineTo(cx2, curr.y);
          ctx.stroke();
        }
      }

      // ── Events (x-only transform to preserve swim lanes) ──
      const now = Date.now();
      for (const evt of fg.events) {
        const alpha = getEventAlpha(evt.timestamp);
        const evtColor = COLORS[evt.type];
        const screenX = evt.x * k + transform.x;
        const screenY = evt.y;

        // Skip if off-screen
        if (screenX < -80 || screenX > width + 80) continue;

        if (k < 1.5) {
          // Dot mode with glow on recent events
          const dotRadius = (4 + evt.weight * 4) * Math.min(k, 1.3);
          const isRecent = (now - evt.timestamp) < 86400000;

          if (isRecent || evt.weight > 1.5) {
            ctx.save();
            ctx.shadowBlur = 10 + evt.weight * 5;
            ctx.shadowColor = hexToRgba(evtColor, 0.5);
            ctx.beginPath();
            ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(evtColor, 0.9);
            ctx.fill();
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(evtColor, alpha);
            ctx.fill();
          }

          // Dot label (summary under dot)
          if (k > 0.6) {
            ctx.fillStyle = 'rgba(228,228,231,0.8)';
            ctx.font = `500 ${Math.max(9, Math.round(11 * Math.min(k, 1.2)))}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const label = evt.summary.length > 20 ? evt.summary.slice(0, 19) + '..' : evt.summary;
            ctx.fillText(label, screenX, screenY + dotRadius + 5);
          }
        } else {
          // Card mode — readable white text, only borders use age alpha
          const cardScale = Math.min(k * 0.7, 1.4);
          const cardW = 180 * cardScale;
          const cardH = 64 * cardScale;
          const cx = screenX - cardW / 2;
          const cy = screenY - cardH / 2;

          // Card background
          ctx.fillStyle = 'rgba(24,24,27,0.92)';
          ctx.strokeStyle = hexToRgba(evtColor, alpha * 0.7);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(cx, cy, cardW, cardH, 6 * cardScale);
          ctx.fill();
          ctx.stroke();

          // Type color bar
          ctx.fillStyle = evtColor;
          ctx.fillRect(cx + 5 * cardScale, cy + 7 * cardScale, 3 * cardScale, cardH - 14 * cardScale);

          // Summary — white text, larger for readability
          ctx.fillStyle = '#f4f4f5';
          ctx.font = `600 ${Math.round(13 * cardScale)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          const summaryText = evt.summary.length > 28 ? evt.summary.slice(0, 27) + '..' : evt.summary;
          ctx.fillText(summaryText, cx + 14 * cardScale, cy + 9 * cardScale);

          // Type + timestamp — light gray, larger
          ctx.fillStyle = '#a1a1aa';
          ctx.font = `${Math.round(10 * cardScale)}px Inter, system-ui, sans-serif`;
          ctx.fillText(`${LABELS[evt.type]}  ·  ${relTime(evt.timestamp)}`, cx + 14 * cardScale, cy + 28 * cardScale);

          // Weight bar
          const barY = cy + cardH - 11 * cardScale;
          ctx.fillStyle = 'rgba(63,63,70,0.5)';
          ctx.fillRect(cx + 14 * cardScale, barY, 80 * cardScale, 3 * cardScale);
          ctx.fillStyle = evtColor;
          ctx.fillRect(cx + 14 * cardScale, barY, (evt.weight / 2) * 80 * cardScale, 3 * cardScale);
        }
      }

      // Frosted header with gradient fade
      const headerGrad = ctx.createLinearGradient(0, 0, 0, 48);
      headerGrad.addColorStop(0, 'rgba(10,10,12,0.9)');
      headerGrad.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, width, 48);

      ctx.fillStyle = fg.dominantColor;
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(fg.name, width / 2, 12);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(`${fg.events.length} events  ·  Timeline  ·  Scroll to navigate`, width / 2, 32);

      // Vignette edges
      const vigLeft = ctx.createLinearGradient(0, 0, 60, 0);
      vigLeft.addColorStop(0, 'rgba(10,10,12,0.7)');
      vigLeft.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = vigLeft;
      ctx.fillRect(0, yTop, 60, LANE_TYPES.length * laneHeight);

      const vigRight = ctx.createLinearGradient(width - 60, 0, width, 0);
      vigRight.addColorStop(0, 'rgba(10,10,12,0)');
      vigRight.addColorStop(1, 'rgba(10,10,12,0.7)');
      ctx.fillStyle = vigRight;
      ctx.fillRect(width - 60, yTop, 60, LANE_TYPES.length * laneHeight);

      return;
    }

    // ── OVERVIEW MODE ──
    ctx.save();
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * transform.x, dpr * transform.y);

    // Constellation lines between nearby groups
    if (currentGroups.length > 1 && k > 0.5) {
      ctx.lineWidth = 0.5 / k;
      for (let i = 0; i < currentGroups.length; i++) {
        for (let j = i + 1; j < currentGroups.length; j++) {
          const a = currentGroups[i], b = currentGroups[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = (a.radius + b.radius) * 3;
          if (dist < maxDist) {
            const lineAlpha = 0.12 * (1 - dist / maxDist);
            ctx.strokeStyle = `rgba(168,162,200,${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    for (const group of currentGroups) {
      const color = group.dominantColor;
      const { x: gx, y: gy, radius } = group;
      const isSelected = group.id === selectedGroupRef.current;

      // Ambient glow halo (larger, subtle)
      if (k > 0.5) {
        const haloGrad = ctx.createRadialGradient(gx, gy, radius * 0.5, gx, gy, radius * 1.6);
        haloGrad.addColorStop(0, hexToRgba(color, isSelected ? 0.12 : 0.04));
        haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, radius * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Radial gradient bubble fill (replaces flat fill)
      const bubbleGrad = ctx.createRadialGradient(gx - radius * 0.3, gy - radius * 0.3, 0, gx, gy, radius);
      bubbleGrad.addColorStop(0, hexToRgba(color, isSelected ? 0.18 : 0.1));
      bubbleGrad.addColorStop(0.6, hexToRgba(color, isSelected ? 0.08 : 0.04));
      bubbleGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, Math.PI * 2);
      ctx.fillStyle = bubbleGrad;
      ctx.fill();

      // Bubble border (glow if selected, gradient stroke otherwise)
      if (isSelected) {
        ctx.save();
        ctx.shadowBlur = 24 / k;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(gx, gy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 / k;
        ctx.stroke();
        // Double glow ring
        ctx.shadowBlur = 12 / k;
        ctx.strokeStyle = hexToRgba(color, 0.4);
        ctx.lineWidth = 1 / k;
        ctx.beginPath();
        ctx.arc(gx, gy, radius + 4 / k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(gx, gy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(color, 0.2);
        ctx.lineWidth = 1 / k;
        ctx.stroke();
      }

      // Ultra zoomed out
      if (k < 0.6) {
        // Inner core orb with gradient
        const coreGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius * 0.6);
        coreGrad.addColorStop(0, hexToRgba(color, 0.6));
        coreGrad.addColorStop(1, hexToRgba(color, 0.15));
        ctx.beginPath();
        ctx.arc(gx, gy, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        ctx.fillStyle = '#f4f4f5';
        ctx.font = `bold ${Math.max(10, 13 / k)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(group.name, gx, gy - radius - 6 / k);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${12 / k}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(`${group.events.length}`, gx, gy);
        continue;
      }

      // Group label (brighter white text)
      ctx.fillStyle = '#f4f4f5';
      ctx.font = `bold ${Math.min(14, 11 / k)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(group.name, gx, gy - radius - 4 / k);

      // Event count subtitle
      ctx.fillStyle = hexToRgba(color, 0.8);
      ctx.font = `${9 / k}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(`${group.events.length} events`, gx, gy + radius + 3 / k);

      // Event dots with enhanced rendering
      for (const evt of group.events) {
        const alpha = getEventAlpha(evt.timestamp);
        const evtColor = COLORS[evt.type];
        const dotRadius = (2.5 + evt.weight * 2.5) / Math.max(0.7, k * 0.5);

        // Glow aura on high-weight or recent events
        if ((evt.weight > 1.0 && alpha > 0.5) || alpha > 0.8) {
          ctx.save();
          ctx.shadowBlur = (8 + evt.weight * 4) / k;
          ctx.shadowColor = hexToRgba(evtColor, 0.5 * alpha);
          ctx.beginPath();
          ctx.arc(evt.x, evt.y, dotRadius * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(evtColor, 0.15 * alpha);
          ctx.fill();
          ctx.restore();
        }

        // Dot with radial gradient fill
        const dotGrad = ctx.createRadialGradient(evt.x, evt.y, 0, evt.x, evt.y, dotRadius);
        dotGrad.addColorStop(0, hexToRgba(evtColor, Math.min(1, alpha + 0.3)));
        dotGrad.addColorStop(1, hexToRgba(evtColor, alpha * 0.6));
        ctx.beginPath();
        ctx.arc(evt.x, evt.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = dotGrad;
        ctx.fill();

        // Bright core on high-weight events
        if (evt.weight > 1.5) {
          ctx.beginPath();
          ctx.arc(evt.x, evt.y, dotRadius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.5 * alpha})`;
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // Draw focus hint when zoom is approaching threshold
    if (k >= 1.2 && k < FOCUS_ZOOM_THRESHOLD) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Frosted pill background
      const hintText = 'Zoom in to focus · ←→ Navigate · Enter to select';
      ctx.font = '10px Inter, system-ui, sans-serif';
      const hintWidth = ctx.measureText(hintText).width + 24;
      const hintX = (width - hintWidth) / 2;
      const hintY = height - 54;
      ctx.fillStyle = 'rgba(24,24,27,0.8)';
      ctx.beginPath();
      ctx.roundRect(hintX, hintY, hintWidth, 24, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(63,63,70,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(212,212,216,0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hintText, width / 2, hintY + 12);
    }

    // Overview vignette edges
    if (!currentFocusId) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vig1 = ctx.createLinearGradient(0, 0, 0, 50);
      vig1.addColorStop(0, 'rgba(10,10,12,0.5)');
      vig1.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = vig1;
      ctx.fillRect(0, 0, width, 50);

      const vig2 = ctx.createLinearGradient(0, height - 50, 0, height);
      vig2.addColorStop(0, 'rgba(10,10,12,0)');
      vig2.addColorStop(1, 'rgba(10,10,12,0.5)');
      ctx.fillStyle = vig2;
      ctx.fillRect(0, height - 50, width, 50);
    }
  }, []);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

  // ─── Hit Testing ──────────────────────────────────────────────────────────

  const findEventAt = useCallback((screenX: number, screenY: number): BrainEvent | null => {
    const t = transformRef.current;
    const focusId = focusedGroupRef.current;

    let closest: BrainEvent | null = null;
    let closestDist = Infinity;

    if (focusId) {
      // Focused mode: compare in screen space (x transformed, y fixed to lanes)
      const threshold = 20 ** 2;

      const searchGroups = groupsRef.current.filter(g => g.id === focusId);
      for (const group of searchGroups) {
        for (const evt of group.events) {
          const evtScreenX = evt.x * t.k + t.x;
          const ex = evtScreenX - screenX;
          const ey = evt.y - screenY; // y is in screen coords directly
          const dist = ex * ex + ey * ey;
          if (dist < closestDist && dist < threshold) {
            closestDist = dist;
            closest = evt;
          }
        }
      }
    } else {
      // Overview mode: full transform
      const dataX = (screenX - t.x) / t.k;
      const dataY = (screenY - t.y) / t.k;
      const threshold = (15 / t.k) ** 2;

      for (const group of groupsRef.current) {
        for (const evt of group.events) {
          const ex = evt.x - dataX;
          const ey = evt.y - dataY;
          const dist = ex * ex + ey * ey;
          if (dist < closestDist && dist < threshold) {
            closestDist = dist;
            closest = evt;
          }
        }
      }
    }
    return closest;
  }, []);

  // ─── Delete Handler ───────────────────────────────────────────────────────

  const handleDelete = useCallback((evt: BrainEvent) => {
    setEvents(prev => prev.filter(e => e.id !== evt.id));
    setSelectedEvent(null);

    const timeout = setTimeout(() => {
      setUndoStack(prev => prev.filter(u => u.event.id !== evt.id));
    }, 5000);

    setUndoStack(prev => [...prev, { event: evt, timeout }]);
    fetch(`/api/brain/signals?id=${evt.id}`, { method: 'DELETE' }).catch(() => {});
  }, []);

  const handleUndo = useCallback((entry: UndoEntry) => {
    clearTimeout(entry.timeout);
    setUndoStack(prev => prev.filter(u => u.event.id !== entry.event.id));
    setEvents(prev => [...prev, entry.event]);
  }, []);

  // ─── Fit to View ──────────────────────────────────────────────────────────

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    const currentGroups = groupsRef.current;
    if (!canvas || currentGroups.length === 0 || !zoomBehaviorRef.current) return;

    const { width, height } = dimRef.current;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const g of currentGroups) {
      minX = Math.min(minX, g.x - g.radius);
      minY = Math.min(minY, g.y - g.radius);
      maxX = Math.max(maxX, g.x + g.radius);
      maxY = Math.max(maxY, g.y + g.radius);
    }

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const scale = Math.min(width * 0.84 / bboxW, height * 0.84 / bboxH, 2.0);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = width / 2 - cx * scale;
    const ty = height / 2 - cy * scale;

    const sel = d3.select(canvas);
    (sel as any).transition().duration(600).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  // ─── Setup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      dimRef.current = { width: w, height: h };

      const currentGroups = groupsRef.current;
      if (currentGroups.length > 0) {
        if (focusedGroupRef.current) {
          const fg = currentGroups.find(g => g.id === focusedGroupRef.current);
          if (fg) layoutFocusedGroup(fg, w, h);
        } else {
          runForceLayout(currentGroups, w, h);
          currentGroups.forEach(packEventsInGroup);
        }
      }
      requestRender();
    };

    resize();
    setTimeout(() => fitToView(), 100);

    // D3 zoom (wheel events handled manually for momentum)
    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 8])
      .filter((event: any) => {
        // Block wheel events — we handle them with momentum
        if (event.type === 'wheel') return false;
        return !event.ctrlKey && !event.button;
      })
      .on('zoom', (event) => {
        const prevK = transformRef.current.k;
        transformRef.current = event.transform;
        const k = event.transform.k;
        setZoomLevel(k);

        // Auto-focus: zoom crossed threshold upward while NOT already focused
        if (!focusedGroupRef.current && prevK < FOCUS_ZOOM_THRESHOLD && k >= FOCUS_ZOOM_THRESHOLD) {
          const group = findGroupAtCursor();
          if (group) {
            enterFocus(group);
            return;
          }
        }

        // Auto-exit: zoom crossed threshold downward while focused
        if (focusedGroupRef.current && k < 0.6) {
          exitFocus();
          return;
        }

        requestRender();
      });

    zoomBehaviorRef.current = zoomBehavior;
    const sel = d3.select(canvas);
    (sel as any).call(zoomBehavior);

    // ── Momentum scroll ──
    const IMMEDIATE_FRACTION = 0.5;
    const MOMENTUM_DRAIN = 0.25; // drain 25% of pool per frame (~400ms coast)
    const MOMENTUM_THRESHOLD = 0.00008;

    const applyZoomDelta = (delta: number) => {
      if (!zoomBehaviorRef.current) return;
      const t = transformRef.current;
      const { x: px, y: py } = zoomCenterRef.current;
      const newK = Math.max(0.2, Math.min(8, t.k * Math.pow(2, delta)));
      if (newK === t.k) return;
      const ratio = newK / t.k;
      const newTransform = d3.zoomIdentity
        .translate(px - (px - t.x) * ratio, py - (py - t.y) * ratio)
        .scale(newK);
      const s = d3.select(canvas);
      zoomBehaviorRef.current.transform(s as any, newTransform);
    };

    const momentumLoop = () => {
      const m = momentumRef.current;
      if (Math.abs(m) < MOMENTUM_THRESHOLD) {
        momentumRef.current = 0;
        momentumAnimRef.current = 0;
        return;
      }
      const frameDelta = m * MOMENTUM_DRAIN;
      momentumRef.current -= frameDelta;
      applyZoomDelta(frameDelta);
      momentumAnimRef.current = requestAnimationFrame(momentumLoop);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      zoomCenterRef.current = { x: screenX, y: screenY };

      // Compute raw delta (sensitive + natural feel)
      const rawDelta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1.0 : 0.002);

      // Counter-scroll: if direction changed, kill momentum
      if (momentumRef.current !== 0 && Math.sign(rawDelta) !== Math.sign(momentumRef.current)) {
        momentumRef.current = 0;
      }

      // Apply immediate portion
      applyZoomDelta(rawDelta * IMMEDIATE_FRACTION);

      // Queue remainder into momentum pool
      momentumRef.current += rawDelta * (1 - IMMEDIATE_FRACTION);

      // Start momentum loop if not running
      if (!momentumAnimRef.current) {
        momentumAnimRef.current = requestAnimationFrame(momentumLoop);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // If not focused, check if clicking a group bubble
      if (!focusedGroupRef.current) {
        const t = transformRef.current;
        const dataX = (mx - t.x) / t.k;
        const dataY = (my - t.y) / t.k;

        for (const group of groupsRef.current) {
          const dx = dataX - group.x;
          const dy = dataY - group.y;
          if (dx * dx + dy * dy <= group.radius * group.radius) {
            // Check if clicking on an event dot within the group
            const evtFound = findEventAt(mx, my);
            if (!evtFound) {
              // Clicked the bubble area, not a specific event → select
              selectedGroupRef.current = group.id;
              setSelectedGroupId(group.id);
              requestRender();
              return;
            }
          }
        }
      }

      // Try to select an event
      const found = findEventAt(mx, my);
      setSelectedEvent(found);
    };

    canvas.addEventListener('click', handleClick);

    // Track cursor position
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      // Cursor style
      const found = findEventAt(cursorRef.current.x, cursorRef.current.y);
      if (found) {
        canvas.style.cursor = 'pointer';
      } else if (!focusedGroupRef.current) {
        const group = findGroupAtCursor();
        canvas.style.cursor = group ? 'pointer' : 'grab';
      } else {
        canvas.style.cursor = 'grab';
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);

    return () => {
      resizeObs.disconnect();
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    };
  }, [requestRender, fitToView, findEventAt, findGroupAtCursor, enterFocus, exitFocus]);

  // Re-render when groups or focus change
  useEffect(() => {
    requestRender();
  }, [groups, focusedGroupId, requestRender]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // In focused mode, only handle Escape
      if (focusedGroupRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          exitFocus();
        }
        return;
      }

      const groups = groupsRef.current;
      if (groups.length === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = groups.findIndex(g => g.id === selectedGroupRef.current);
        const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % groups.length;
        selectedGroupRef.current = groups[nextIdx].id;
        setSelectedGroupId(groups[nextIdx].id);
        requestRender();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = groups.findIndex(g => g.id === selectedGroupRef.current);
        const nextIdx = currentIdx <= 0 ? groups.length - 1 : currentIdx - 1;
        selectedGroupRef.current = groups[nextIdx].id;
        setSelectedGroupId(groups[nextIdx].id);
        requestRender();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const group = groups.find(g => g.id === selectedGroupRef.current);
        if (group) {
          selectedGroupRef.current = null;
          setSelectedGroupId(null);
          enterFocus(group);
        }
      } else if (e.key === 'Escape') {
        if (selectedGroupRef.current) {
          e.preventDefault();
          selectedGroupRef.current = null;
          setSelectedGroupId(null);
          requestRender();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestRender, enterFocus, exitFocus]);

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: BG }}>
      <div ref={containerRef} className="relative flex-1" style={{ minHeight: 300 }}>
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Focus mode: back button */}
        {focusedGroupId && (
          <button
            onClick={exitFocus}
            className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/30 text-zinc-300 text-xs font-medium hover:bg-zinc-800/90 hover:border-zinc-600/40 hover:text-zinc-100 transition-all shadow-lg"
          >
            <ArrowLeft size={13} />
            <span>All Groups</span>
          </button>
        )}

        {/* Selected event drawer (slides up from bottom) */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              key={selectedEvent.id}
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute bottom-0 left-0 right-0 z-50"
            >
              <div className="mx-auto max-w-md bg-zinc-900/90 backdrop-blur-2xl border border-zinc-600/30 border-b-0 rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)] px-5 py-4">
                {/* Drag handle */}
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-zinc-600/60" />
                </div>
                <div className="flex items-start gap-3">
                  {/* Color indicator */}
                  <div className="w-1 self-stretch rounded-full mt-0.5" style={{ backgroundColor: COLORS[selectedEvent.type] }} />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-zinc-200">{LABELS[selectedEvent.type]}</span>
                      <span className="text-[10px] text-zinc-500">{relTime(selectedEvent.timestamp)}</span>
                      <span className="text-[10px] text-zinc-500 ml-auto">{selectedEvent.context_name}</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-100 mb-2">{selectedEvent.summary}</div>
                    <div className="flex items-center gap-3">
                      {/* Weight */}
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full rounded-full" style={{
                            width: `${(selectedEvent.weight / 2) * 100}%`,
                            backgroundColor: COLORS[selectedEvent.type],
                          }} />
                        </div>
                        <span className="text-[10px] text-zinc-500">{selectedEvent.weight.toFixed(1)}</span>
                      </div>
                      {/* Actions */}
                      <button
                        onClick={() => handleDelete(selectedEvent)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={10} />
                        Delete
                      </button>
                    </div>
                  </div>
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-1 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Undo toasts */}
        {undoStack.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
            {undoStack.map((entry) => (
              <div key={entry.event.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800/95 backdrop-blur-sm border border-zinc-600/50 shadow-xl">
                <span className="text-xs text-zinc-300">Event deleted</span>
                <button
                  onClick={() => handleUndo(entry)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors"
                >
                  <Undo2 size={11} />
                  Undo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar — glass morphism */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/70 backdrop-blur-md border-t border-zinc-700/30 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">
            <span className="text-zinc-300 font-medium">{Math.round(zoomLevel * 100)}%</span>
          </span>
          {focusedGroup ? (
            <span className="text-zinc-300">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/40">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: focusedGroup.dominantColor }} />
                <span className="font-medium">{focusedGroup.name}</span>
                <span className="text-zinc-500">{focusedGroup.events.length}</span>
              </span>
            </span>
          ) : (
            <>
              {selectedGroupId ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/40">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: groups.find(g => g.id === selectedGroupId)?.dominantColor }} />
                  <span className="font-medium text-zinc-200">
                    {groups.find(g => g.id === selectedGroupId)?.name}
                  </span>
                  <span className="text-zinc-500 text-[10px]">Enter ↵</span>
                </span>
              ) : (
                <>
                  <span className="text-zinc-500">
                    <span className="text-zinc-300">{groups.length}</span> groups
                  </span>
                  <span className="text-zinc-500">
                    <span className="text-zinc-300">{events.length}</span> events
                  </span>
                </>
              )}
              <span className="text-zinc-600 text-[10px] hidden md:inline">
                ←→ navigate · ↵ focus · Esc clear
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}40` }} />
              <span className="text-zinc-500 hidden lg:inline">{LABELS[type as SignalType]}</span>
            </div>
          ))}
          {!focusedGroupId && (
            <button
              onClick={fitToView}
              className="ml-1 p-1.5 rounded-md hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-200 transition-all"
              title="Fit to view"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

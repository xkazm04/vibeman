'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Maximize2 } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';

import { hexToRgba, relTime, getEventRadius } from '../sub_MemoryCanvas/lib/helpers';
import { COLORS, RECENCY_GLOW_HOURS, LANE_TYPES } from '../sub_MemoryCanvas/lib/constants';
import type { SignalType, FilterState } from '../sub_MemoryCanvas/lib/types';
import type { RenderContext } from '../sub_MemoryCanvas/lib/canvasRenderPipeline';
import { executeTimelineRenderPipeline, TIMELINE_MARGIN } from './timelineRenderPipeline';
import { SIGNAL_METADATA } from '@/types/signals';

// ─── Local Types ────────────────────────────────────────────────────────────

interface BrainEvent {
  id: string;
  type: SignalType;
  context_name: string;
  timestamp: number;
  weight: number;
  summary: string;
  x: number;
  y: number;
}

interface TooltipData {
  event: BrainEvent;
  screenX: number;
  screenY: number;
}

// ─── Local Constants ────────────────────────────────────────────────────────

const SIGNAL_TYPES = LANE_TYPES;

/** Full labels for timeline lanes and tooltips (derived from canonical metadata) */
const LANE_LABELS: Record<string, string> = {};
for (const type of LANE_TYPES) {
  LANE_LABELS[type] = SIGNAL_METADATA[type].displayName;
}

const BG = '#18181b';
const GRID = '#27272a';
const MARGIN = TIMELINE_MARGIN;

// ─── Data Helpers ───────────────────────────────────────────────────────────

function deriveSummary(signalType: string, data: Record<string, unknown>): string {
  switch (signalType) {
    case 'git_activity': {
      const msg = data.commitMessage as string;
      const files = data.filesChanged as string[] | undefined;
      return msg || `${files?.length || 0} files changed`;
    }
    case 'implementation': {
      const name = data.requirementName as string;
      const success = data.success as boolean;
      return name ? `${success ? '\u2713' : '\u2717'} ${name}` : (success ? 'Success' : 'Failed');
    }
    case 'context_focus': {
      const title = data.ideaTitle as string | undefined;
      const accepted = data.accepted as boolean | undefined;
      if (title) return accepted ? `Accepted: ${title}` : `Rejected: ${title}`;
      return data.contextName as string || 'Context activity';
    }
    case 'api_focus': {
      const endpoint = data.endpoint as string;
      return endpoint ? `${data.method || 'GET'} ${endpoint}` : 'API activity';
    }
    default:
      return signalType;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EventCanvasTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventsRef = useRef<BrainEvent[]>([]);
  const transformRef = useRef(d3.zoomIdentity);
  const dimRef = useRef({ width: 800, height: 500 });
  const animRef = useRef<number>(0);
  const pulseAnimRef = useRef<number>(0);
  const frameCounterRef = useRef(0);

  const activeProject = useClientProjectStore(s => s.activeProject);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEmpty, setIsEmpty] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<SignalType>>(new Set(SIGNAL_TYPES));
  const visibleTypesRef = useRef<Set<SignalType>>(new Set(SIGNAL_TYPES));

  // Keep ref in sync with state for render loop access
  useEffect(() => {
    visibleTypesRef.current = visibleTypes;
  }, [visibleTypes]);

  const toggleType = useCallback((type: SignalType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size <= 1) return prev; // prevent deselecting all
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // ─── Collision-resolved positioning ─────────────────────────────────────

  const positionEvents = useCallback((events: BrainEvent[], w: number, h: number) => {
    const plotW = w - MARGIN.left - MARGIN.right;
    const plotH = h - MARGIN.top - MARGIN.bottom;
    const now = Date.now();
    const span = 7 * 24 * 60 * 60 * 1000;
    const start = now - span;
    const laneH = plotH / 4;
    const inset = laneH * 0.15;

    // 1. Initial positioning: time-based X, lane-center Y
    events.forEach((evt) => {
      const tFrac = Math.max(0, Math.min(1, (evt.timestamp - start) / span));
      const laneIdx = SIGNAL_TYPES.indexOf(evt.type);
      evt.x = MARGIN.left + tFrac * plotW;
      evt.y = MARGIN.top + laneIdx * laneH + laneH / 2;
    });

    // 2. Per-lane multi-pass collision resolution (6 passes)
    for (const laneType of SIGNAL_TYPES) {
      const laneIdx = SIGNAL_TYPES.indexOf(laneType);
      const laneTop = MARGIN.top + laneIdx * laneH + inset;
      const laneBottom = MARGIN.top + (laneIdx + 1) * laneH - inset;
      const laneEvents = events.filter(e => e.type === laneType);
      laneEvents.sort((a, b) => a.x - b.x);

      for (let pass = 0; pass < 6; pass++) {
        for (let i = 0; i < laneEvents.length; i++) {
          const a = laneEvents[i];
          const windowEnd = Math.min(laneEvents.length, i + 8);

          for (let j = i + 1; j < windowEnd; j++) {
            const b = laneEvents[j];
            const minDist = getEventRadius(a.weight, a.timestamp) + getEventRadius(b.weight, b.timestamp) + 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist && dist > 0.001) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              // 20% X nudge, 80% Y nudge
              const xPush = overlap * nx * 0.2;
              const yPush = overlap * (ny === 0 ? 1 : ny / Math.abs(ny)) * 0.8;

              a.x -= xPush;
              a.y -= yPush;
              b.x += xPush;
              b.y += yPush;

              // Clamp Y to lane bounds
              a.y = Math.max(laneTop, Math.min(laneBottom, a.y));
              b.y = Math.max(laneTop, Math.min(laneBottom, b.y));
            }
          }
        }
      }
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimRef.current;
    const dpr = window.devicePixelRatio || 1;
    const transform = transformRef.current;
    const k = transform.k;
    const events = eventsRef.current;
    const visible = visibleTypesRef.current;

    // Clear background
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    const isEmptyState = events.length === 0;
    const now = Date.now();

    // Build render context
    const renderContext: RenderContext = {
      ctx,
      width,
      height,
      dpr,
      transform,
      now,
      filterState: { visibleTypes: visible },
    };

    // Filter events by visibleTypes
    const visibleEvents = events.filter(e => visible.has(e.type));

    // Execute timeline render pipeline
    executeTimelineRenderPipeline(renderContext, {
      emptyState: isEmptyState ? {
        laneTypes: SIGNAL_TYPES,
        laneLabels: LANE_LABELS,
        margin: MARGIN,
      } : undefined,
      laneBackground: !isEmptyState ? {
        laneTypes: SIGNAL_TYPES,
        laneLabels: LANE_LABELS,
        visibleTypes: visible,
        margin: MARGIN,
      } : undefined,
      timeAxis: !isEmptyState ? {
        margin: MARGIN,
        dayCount: 7,
      } : undefined,
      timelineGrid: !isEmptyState ? {
        laneCount: 4,
        dayCount: 7,
        margin: MARGIN,
        gridColor: GRID,
      } : undefined,
      connectionLines: !isEmptyState && k < 3 ? {
        events: visibleEvents,
        mode: 'grouped',
        coordinateMode: 'world',
        opacity: 0.15,
      } : undefined,
      eventDots: !isEmptyState && k < 3 ? {
        events: visibleEvents,
        coordinateMode: 'world',
        dotScale: 1.0 / Math.max(1, k * 0.3),
        enablePulse: true,
        enableGlow: true,
        useGradients: true,
      } : undefined,
      eventCards: !isEmptyState && k >= 3 ? {
        events: visibleEvents,
        coordinateMode: 'world',
        cardSize: { width: 150, height: 50 },
        showContext: true,
      } : undefined,
      smartLabels: !isEmptyState && k < 3 ? {
        events: visibleEvents,
        coordinateMode: 'world',
        maxLabels: Math.round(30 / k),
        fontSize: Math.max(8, Math.round(10 / Math.max(1, k * 0.7))),
      } : undefined,
    });
  }, []);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

  // ─── Recency animation loop (~30fps) ────────────────────────────────

  const startPulseAnimation = useCallback(() => {
    cancelAnimationFrame(pulseAnimRef.current);

    const tick = () => {
      frameCounterRef.current++;
      // Throttle to ~30fps (every other rAF at 60fps)
      if (frameCounterRef.current % 2 === 0) {
        render();
      }
      pulseAnimRef.current = requestAnimationFrame(tick);
    };

    pulseAnimRef.current = requestAnimationFrame(tick);
  }, [render]);

  const stopPulseAnimation = useCallback(() => {
    cancelAnimationFrame(pulseAnimRef.current);
    pulseAnimRef.current = 0;
  }, []);

  // Manage pulse animation based on whether recent events exist
  useEffect(() => {
    const events = eventsRef.current;
    const hasRecent = events.some(e => (Date.now() - e.timestamp) / 3600000 < RECENCY_GLOW_HOURS);
    if (hasRecent) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
    return () => stopPulseAnimation();
  }, [isEmpty, startPulseAnimation, stopPulseAnimation]);

  // Re-render when visibleTypes changes
  useEffect(() => {
    requestRender();
  }, [visibleTypes, requestRender]);

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sel = d3.select(canvas);
    (sel as any).transition().duration(600).call(d3.zoom<HTMLCanvasElement, unknown>().transform, d3.zoomIdentity);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;

    const loadEvents = async () => {
      let events: BrainEvent[] = [];

      if (activeProject?.id) {
        try {
          const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const params = new URLSearchParams({
            projectId: activeProject.id,
            limit: '200',
            since,
          });
          const res = await fetch(`/api/brain/signals?${params.toString()}`);
          const data = await res.json();

          if (data.success && data.signals?.length > 0) {
            events = data.signals.map((signal: any, i: number) => {
              let summary = signal.signal_type;
              try {
                const parsed = JSON.parse(signal.data);
                summary = deriveSummary(signal.signal_type, parsed);
              } catch { /* use raw type as summary */ }

              return {
                id: `tl-${signal.id || i}`,
                type: signal.signal_type as SignalType,
                context_name: signal.context_name || 'General',
                timestamp: new Date(signal.timestamp).getTime(),
                weight: Math.max(0.2, Math.min(2.0, signal.weight || 1.0)),
                summary,
                x: 0,
                y: 0,
              };
            }).filter((e: BrainEvent) => SIGNAL_TYPES.includes(e.type));

            setIsEmpty(false);
          }
        } catch {
          // API error - fall back to empty
        }
      }

      if (events.length === 0) {
        setIsEmpty(true);
      }

      if (cancelled) return;
      eventsRef.current = events;

      // Start pulse animation if recent events exist
      const hasRecent = events.some(e => (Date.now() - e.timestamp) / 3600000 < RECENCY_GLOW_HOURS);
      if (hasRecent) {
        startPulseAnimation();
      }

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
        positionEvents(eventsRef.current, w, h);
        requestRender();
      };

      resize();

      const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.4, 15])
        .on('zoom', (event) => {
          transformRef.current = event.transform;
          setZoomLevel(event.transform.k);
          requestRender();
        });

      const sel = d3.select(canvas);
      (sel as any).call(zoomBehavior);

      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const t = transformRef.current;
        const dataX = (mx - t.x) / t.k;
        const dataY = (my - t.y) / t.k;

        let closest: BrainEvent | null = null;
        let closestDist = Infinity;
        const vis = visibleTypesRef.current;
        eventsRef.current.forEach(evt => {
          if (!vis.has(evt.type)) return;
          const dx = evt.x - dataX;
          const dy = evt.y - dataY;
          const dist = dx * dx + dy * dy;
          if (dist < closestDist) { closestDist = dist; closest = evt; }
        });

        const threshold = (20 / t.k) ** 2;
        if (closest && closestDist < threshold) {
          setTooltip({ event: closest, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
        } else {
          setTooltip(null);
        }
      };

      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', () => setTooltip(null));

      const resizeObs = new ResizeObserver(resize);
      resizeObs.observe(container);

      return () => {
        cancelled = true;
        resizeObs.disconnect();
        canvas.removeEventListener('mousemove', handleMouseMove);
      };
    };

    const cleanup = loadEvents();
    return () => {
      cancelled = true;
      stopPulseAnimation();
      cleanup.then(fn => fn?.());
    };
  }, [activeProject?.id, positionEvents, requestRender, startPulseAnimation, stopPulseAnimation]);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
      <div ref={containerRef} className="relative flex-1" style={{ minHeight: 300 }}>
        <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {tooltip && (
          <div className="absolute z-50 pointer-events-none" style={{ left: tooltip.screenX + 14, top: tooltip.screenY - 10 }}>
            <div className="bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl p-3 min-w-[170px] max-w-[220px]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                  style={{ backgroundColor: COLORS[tooltip.event.type] }}>
                  {LANE_LABELS[tooltip.event.type]}
                </span>
              </div>
              <div className="text-zinc-100 text-xs font-medium">{tooltip.event.context_name}</div>
              <div className="text-zinc-400 text-[10px] mt-0.5">{relTime(tooltip.event.timestamp)}</div>
              <div className="text-zinc-300 text-[10px] mt-1">{tooltip.event.summary}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-zinc-500 text-[9px]">Weight</span>
                <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${(tooltip.event.weight / 2) * 100}%`,
                    backgroundColor: COLORS[tooltip.event.type],
                  }} />
                </div>
                <span className="text-zinc-400 text-[9px]">{tooltip.event.weight.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glass-morphism toolbar with interactive legend */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 backdrop-blur-xl border-t border-zinc-700/20 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">
            Zoom: <span className="text-zinc-200 font-medium">{Math.round(zoomLevel * 100)}%</span>
          </span>
          <span className="text-zinc-400">
            Events: <span className="text-zinc-200">{eventsRef.current.filter(e => visibleTypes.has(e.type)).length}</span>
          </span>
          <span className="text-zinc-500">{zoomLevel < 3 ? '\u25CF Dots' : '\u25AA Cards'}</span>
        </div>
        <div className="flex items-center gap-4">
          {SIGNAL_TYPES.map(type => {
            const active = visibleTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-1.5 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[type] }} />
                <span className={`text-zinc-400 ${active ? '' : 'line-through'}`}>{LANE_LABELS[type]}</span>
              </button>
            );
          })}
          <button onClick={fitToView} className="ml-2 p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Reset zoom">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

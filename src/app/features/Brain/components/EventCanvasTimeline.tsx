'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Maximize2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type SignalType = 'git_activity' | 'api_focus' | 'context_focus' | 'implementation';

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

// ─── Constants ──────────────────────────────────────────────────────────────

const SIGNAL_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

const COLORS: Record<SignalType, string> = {
  git_activity: '#10b981',
  api_focus: '#3b82f6',
  context_focus: '#a855f7',
  implementation: '#f59e0b',
};

const LABELS: Record<SignalType, string> = {
  git_activity: 'Git Activity',
  api_focus: 'API Focus',
  context_focus: 'Context Focus',
  implementation: 'Implementation',
};

const CONTEXT_NAMES = [
  'Auth Module', 'Payment Gateway', 'User Dashboard', 'API Layer',
  'Data Pipeline', 'Search Engine', 'Notification System', 'File Storage',
  'Analytics Engine', 'Config Service',
];

const SUMMARIES: Record<SignalType, string[]> = {
  git_activity: ['Committed refactor', 'Merged feature', 'Fixed conflicts', 'Pushed hotfix', 'Tagged release'],
  api_focus: ['Optimized endpoint', 'Added rate limit', 'Fixed CORS', 'Cached queries', 'Updated docs'],
  context_focus: ['Analyzed deps', 'Mapped relations', 'Scanned debt', 'Reviewed arch', 'Updated bounds'],
  implementation: ['Built feature', 'Created hook', 'Added dark mode', 'Refactored state', 'Added shortcuts'],
};

const BG = '#18181b';
const GRID = '#27272a';
const MARGIN = { top: 50, right: 30, bottom: 30, left: 130 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

function generateEvents(): BrainEvent[] {
  const now = Date.now();
  const span = 7 * 24 * 60 * 60 * 1000;
  const start = now - span;
  const events: BrainEvent[] = [];
  let seed = 123;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  for (let i = 0; i < 60; i++) {
    const typeIdx = Math.floor(rand() * 4);
    const ctxIdx = Math.floor(rand() * CONTEXT_NAMES.length);
    const type = SIGNAL_TYPES[typeIdx];
    const day = Math.floor(rand() * 7);
    const hour = rand() < 0.7 ? 9 + rand() * 9 : rand() * 24;
    const ts = start + day * 86400000 + hour * 3600000 + rand() * 3600000;

    events.push({
      id: `tl-${i}`,
      type,
      context_name: CONTEXT_NAMES[ctxIdx],
      timestamp: Math.min(ts, now),
      weight: 0.2 + rand() * 1.8,
      summary: SUMMARIES[type][Math.floor(rand() * SUMMARIES[type].length)],
      x: 0,
      y: 0,
    });
  }
  return events;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EventCanvasTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventsRef = useRef<BrainEvent[]>([]);
  const transformRef = useRef(d3.zoomIdentity);
  const dimRef = useRef({ width: 800, height: 500 });
  const animRef = useRef<number>(0);

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const positionEvents = useCallback((events: BrainEvent[], w: number, h: number) => {
    const plotW = w - MARGIN.left - MARGIN.right;
    const plotH = h - MARGIN.top - MARGIN.bottom;
    const now = Date.now();
    const span = 7 * 24 * 60 * 60 * 1000;
    const start = now - span;
    const laneH = plotH / 4;

    events.forEach((evt) => {
      const tFrac = Math.max(0, Math.min(1, (evt.timestamp - start) / span));
      const laneIdx = SIGNAL_TYPES.indexOf(evt.type);
      const idNum = parseInt(evt.id.split('-')[1]);
      const jitter = (Math.sin(idNum * 5.7) * 0.35) * laneH;
      evt.x = MARGIN.left + tFrac * plotW;
      evt.y = MARGIN.top + laneIdx * laneH + laneH / 2 + jitter;
    });
  }, []);

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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const laneH = plotH / 4;

    // Lane labels (fixed)
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    SIGNAL_TYPES.forEach((type, i) => {
      const y = MARGIN.top + i * laneH + laneH / 2;
      ctx.fillStyle = COLORS[type];
      ctx.fillRect(8, y - 6, 8, 12);
      ctx.fillStyle = '#d4d4d8';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(LABELS[type], 24, y);
    });

    // Time axis (fixed)
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#71717a';
    ctx.textAlign = 'center';
    const now = Date.now();
    for (let d = 0; d <= 7; d++) {
      const x = MARGIN.left + (d / 7) * plotW;
      const date = new Date(now - (7 - d) * 86400000);
      ctx.fillText(date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), x, MARGIN.top - 12);
    }

    // Zoom transform for content
    ctx.save();
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * transform.x, dpr * transform.y);

    // Grid
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1 / k;
    for (let i = 0; i <= 4; i++) {
      const y = MARGIN.top + i * laneH;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
    }
    for (let d = 0; d <= 7; d++) {
      const x = MARGIN.left + (d / 7) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
    }

    // Events
    if (k < 3) {
      events.forEach((evt) => {
        const color = COLORS[evt.type];
        const radius = (3 + evt.weight * 3) / Math.max(1, k * 0.3);
        ctx.beginPath();
        ctx.arc(evt.x, evt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.75);
        ctx.fill();
        if (evt.weight > 1.2) {
          ctx.shadowBlur = 8 / k;
          ctx.shadowColor = hexToRgba(color, 0.5);
          ctx.beginPath();
          ctx.arc(evt.x, evt.y, radius * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Event title label under dot
        if (k > 0.6) {
          const fontSize = Math.max(8, Math.round(10 / Math.max(1, k * 0.7)));
          ctx.fillStyle = 'rgba(228,228,231,0.75)';
          ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = evt.summary.length > 18 ? evt.summary.slice(0, 17) + '..' : evt.summary;
          ctx.fillText(label, evt.x, evt.y + radius + 4 / k);
        }
      });

      // Connection lines
      const groups = new Map<string, BrainEvent[]>();
      events.forEach(e => {
        if (!groups.has(e.context_name)) groups.set(e.context_name, []);
        groups.get(e.context_name)!.push(e);
      });
      groups.forEach((evts) => {
        if (evts.length < 2) return;
        ctx.strokeStyle = hexToRgba(COLORS[evts[0].type], 0.15);
        ctx.lineWidth = 0.5 / k;
        ctx.setLineDash([4 / k, 4 / k]);
        ctx.beginPath();
        evts.forEach((e, i) => { if (i === 0) ctx.moveTo(e.x, e.y); else ctx.lineTo(e.x, e.y); });
        ctx.stroke();
        ctx.setLineDash([]);
      });
    } else {
      // Card mode
      events.forEach((evt) => {
        const color = COLORS[evt.type];
        const cardW = 150 / k;
        const cardH = 50 / k;
        const x = evt.x - cardW / 2;
        const y = evt.y - cardH / 2;
        ctx.fillStyle = '#27272a';
        ctx.strokeStyle = hexToRgba(color, 0.6);
        ctx.lineWidth = 1.5 / k;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 4 / k);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(x + 4 / k, y + 4 / k, 3 / k, cardH - 8 / k);
        ctx.fillStyle = '#e4e4e7';
        ctx.font = `${9 / k}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(evt.context_name.slice(0, 18), x + 12 / k, y + 6 / k);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = `${7.5 / k}px Inter, system-ui, sans-serif`;
        ctx.fillText(evt.summary.slice(0, 22), x + 12 / k, y + 20 / k);
        ctx.fillText(relTime(evt.timestamp), x + 12 / k, y + 32 / k);
      });
    }

    ctx.restore();
  }, []);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

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

    const events = generateEvents();
    eventsRef.current = events;

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
      positionEvents(events, w, h);
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
      events.forEach(evt => {
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
      resizeObs.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [positionEvents, requestRender]);

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
                  {LABELS[tooltip.event.type]}
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

      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-t border-zinc-700/50 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">
            Zoom: <span className="text-zinc-200 font-medium">{Math.round(zoomLevel * 100)}%</span>
          </span>
          <span className="text-zinc-400">
            Events: <span className="text-zinc-200">{eventsRef.current.length}</span>
          </span>
          <span className="text-zinc-500">{zoomLevel < 3 ? '● Dots' : '▪ Cards'}</span>
        </div>
        <div className="flex items-center gap-4">
          {SIGNAL_TYPES.map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[type] }} />
              <span className="text-zinc-400">{LABELS[type]}</span>
            </div>
          ))}
          <button onClick={fitToView} className="ml-2 p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Reset zoom">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

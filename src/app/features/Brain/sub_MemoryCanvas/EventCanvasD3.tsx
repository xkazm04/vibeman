'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ArrowLeft } from 'lucide-react';
import type { BrainEvent, Group, UndoEntry } from './lib/types';
import { BG } from './lib/constants';
import { generateEvents } from './lib/mockData';
import { formGroups, runForceLayout, packEventsInGroup } from './lib/layout';
import { renderFocused } from './lib/renderFocused';
import { renderOverview } from './lib/renderOverview';
import { useCanvasInteraction } from './lib/useCanvasInteraction';
import { EventDetailDrawer } from './components/EventDetailDrawer';
import { CanvasToolbar } from './components/CanvasToolbar';
import { UndoToasts } from './components/UndoToasts';

export default function EventCanvasD3() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const dimRef = useRef({ width: 800, height: 500 });
  const animRef = useRef<number>(0);
  const groupsRef = useRef<Group[]>([]);
  const cursorRef = useRef({ x: 0, y: 0 });
  const focusedGroupRef = useRef<string | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const momentumRef = useRef(0);
  const momentumAnimRef = useRef<number>(0);
  const zoomCenterRef = useRef({ x: 0, y: 0 });
  const selectedGroupRef = useRef<string | null>(null);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<BrainEvent | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [events, setEvents] = useState<BrainEvent[]>(() => generateEvents());
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  // Render callback
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimRef.current;
    const dpr = window.devicePixelRatio || 1;
    const transform = transformRef.current;
    const currentFocusId = focusedGroupRef.current;

    // Background
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
    bgGrad.addColorStop(0, '#141418');
    bgGrad.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid (overview only)
    if (!currentFocusId && transform.k > 0.4) {
      ctx.strokeStyle = 'rgba(63,63,70,0.06)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const ox = transform.x % (gridSize * transform.k);
      const oy = transform.y % (gridSize * transform.k);
      for (let gx = ox; gx < width; gx += gridSize * transform.k) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      for (let gy = oy; gy < height; gy += gridSize * transform.k) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }
    }

    if (currentFocusId) {
      const fg = groupsRef.current.find(g => g.id === currentFocusId);
      if (fg) renderFocused({ ctx, group: fg, width, height, transform, dpr });
    } else {
      renderOverview({ ctx, groups: groupsRef.current, width, height, transform, dpr, selectedGroupId: selectedGroupRef.current });
    }
  }, []);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

  // Fit to view
  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    const currentGroups = groupsRef.current;
    if (!canvas || currentGroups.length === 0 || !zoomBehaviorRef.current) return;
    const { width, height } = dimRef.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const g of currentGroups) {
      minX = Math.min(minX, g.x - g.radius); minY = Math.min(minY, g.y - g.radius);
      maxX = Math.max(maxX, g.x + g.radius); maxY = Math.max(maxY, g.y + g.radius);
    }
    const bboxW = maxX - minX; const bboxH = maxY - minY;
    const scale = Math.min(width * 0.84 / bboxW, height * 0.84 / bboxH, 2.0);
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
    const tx = width / 2 - cx * scale; const ty = height / 2 - cy * scale;
    (d3.select(canvas) as any).transition().duration(600).call(
      zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  // Delete/Undo
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

  // Canvas interaction hook
  useCanvasInteraction({
    canvasRef, containerRef, transformRef, dimRef, groupsRef,
    focusedGroupRef, selectedGroupRef, cursorRef,
    zoomBehaviorRef, momentumRef, momentumAnimRef, zoomCenterRef,
    setZoomLevel, setFocusedGroupId, setSelectedGroupId, setSelectedEvent,
    requestRender, fitToView,
  });

  // Re-render on group/focus changes
  useEffect(() => { requestRender(); }, [groups, focusedGroupId, requestRender]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: BG }}>
      <div ref={containerRef} className="relative flex-1" style={{ minHeight: 300 }}>
        <canvas ref={canvasRef} className="absolute inset-0" />

        {focusedGroupId && (
          <button
            onClick={() => { focusedGroupRef.current = null; setFocusedGroupId(null); setSelectedEvent(null); groupsRef.current.forEach(packEventsInGroup); requestRender(); }}
            className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/30 text-zinc-300 text-xs font-medium hover:bg-zinc-800/90 hover:border-zinc-600/40 hover:text-zinc-100 transition-all shadow-lg"
          >
            <ArrowLeft size={13} />
            <span>All Groups</span>
          </button>
        )}

        <EventDetailDrawer
          selectedEvent={selectedEvent}
          onDelete={handleDelete}
          onClose={() => setSelectedEvent(null)}
        />

        <UndoToasts undoStack={undoStack} onUndo={handleUndo} />
      </div>

      <CanvasToolbar
        zoomLevel={zoomLevel}
        groups={groups}
        eventCount={events.length}
        focusedGroup={focusedGroup}
        selectedGroupId={selectedGroupId}
        onFitToView={fitToView}
      />
    </div>
  );
}

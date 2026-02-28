'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ArrowLeft } from 'lucide-react';
import type { BrainEvent, Group, UndoEntry, SignalType, FilterState } from './lib/types';
import { BG } from './lib/constants';
import { packEventsInGroup } from './lib/canvasLayout';
import { CanvasStore } from './lib/canvasStore';
import { useCanvasData } from './lib/useCanvasData';
import { renderFocused } from './lib/renderFocused';
import { renderOverview } from './lib/renderOverview';
import { renderEmptyState, resetEmptyState } from './lib/renderEmptyState';
import { useCanvasInteraction } from './lib/useCanvasInteraction';
import { EventDetailDrawer } from './components/EventDetailDrawer';
import { CanvasToolbar } from './components/CanvasToolbar';
import { UndoToasts } from './components/UndoToasts';

const ALL_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

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
  const emptyFrameRef = useRef(0);
  const emptyAnimRef = useRef<number>(0);
  const filterStateRef = useRef<FilterState>({ visibleTypes: new Set(ALL_TYPES) });

  // ── Imperative store (events/groups live here, not React state) ──
  const storeRef = useRef<CanvasStore>(null!);
  if (!storeRef.current) {
    storeRef.current = new CanvasStore();
  }
  const store = storeRef.current;

  // ── React state: UI-only concerns ────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<BrainEvent | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<SignalType>>(new Set(ALL_TYPES));
  // Toolbar needs groups/eventCount — we track a render version to trigger re-reads
  const [toolbarVersion, setToolbarVersion] = useState(0);

  const toggleType = useCallback((type: SignalType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size <= 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      filterStateRef.current = { visibleTypes: next };
      return next;
    });
  }, []);

  // ── Render callback (reads entirely from refs/store) ─────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimRef.current;
    const dpr = window.devicePixelRatio || 1;
    const transform = transformRef.current;
    const currentFocusId = focusedGroupRef.current;
    const currentGroups = store.groups;
    const filterState = filterStateRef.current;

    // Keep store dimensions and groupsRef in sync
    store.setDimensions(width, height);
    groupsRef.current = currentGroups;

    // Empty state: animated particles
    if (currentGroups.length === 0) {
      emptyFrameRef.current++;
      renderEmptyState(ctx, width, height, dpr, emptyFrameRef.current);
      return;
    }

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
      const fg = currentGroups.find(g => g.id === currentFocusId);
      if (fg) renderFocused({ ctx, group: fg, width, height, transform, dpr, filterState });
    } else {
      renderOverview({ ctx, groups: currentGroups, width, height, transform, dpr, selectedGroupId: selectedGroupRef.current, filterState });
    }
  }, [store]);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

  // Wire store render callback
  useEffect(() => {
    store.onRender(() => {
      requestRender();
      // Bump toolbar version so it re-reads groups/eventCount from store
      setToolbarVersion(v => v + 1);
    });
  }, [store, requestRender]);

  // Re-render on filter changes (filter state is in a ref, but the
  // React state change is our signal to redraw)
  useEffect(() => { requestRender(); }, [visibleTypes, requestRender]);

  // Re-render when focus changes (UI state drives which render path to use)
  useEffect(() => { requestRender(); }, [focusedGroupId, requestRender]);

  // ── Data fetching (pushes into store, not React state) ───────────
  const getFocusedGroupId = useCallback(() => focusedGroupRef.current, []);
  useCanvasData({ store, getFocusedGroupId });

  // Fit to view
  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    const currentGroups = store.groups;
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
  }, [store]);

  // ── Delete / Undo (mutate store directly) ────────────────────────
  const handleDelete = useCallback((evt: BrainEvent) => {
    store.removeEvent(evt.id, focusedGroupRef.current);
    setSelectedEvent(null);
    const timeout = setTimeout(() => {
      setUndoStack(prev => prev.filter(u => u.event.id !== evt.id));
    }, 5000);
    setUndoStack(prev => [...prev, { event: evt, timeout }]);
    fetch(`/api/brain/signals?id=${evt.id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      })
      .catch(() => {
        clearTimeout(timeout);
        setUndoStack(prev => prev.filter(u => u.event.id !== evt.id));
        store.restoreEvent(evt, focusedGroupRef.current);
      });
  }, [store]);

  const handleUndo = useCallback((entry: UndoEntry) => {
    clearTimeout(entry.timeout);
    setUndoStack(prev => prev.filter(u => u.event.id !== entry.event.id));
    store.restoreEvent(entry.event, focusedGroupRef.current);
  }, [store]);

  // Canvas interaction hook
  useCanvasInteraction({
    canvasRef, containerRef, transformRef, dimRef, groupsRef,
    focusedGroupRef, selectedGroupRef, cursorRef,
    zoomBehaviorRef, momentumRef, momentumAnimRef, zoomCenterRef,
    setZoomLevel, setFocusedGroupId, setSelectedGroupId, setSelectedEvent,
    requestRender, fitToView,
  });

  // Empty state animation loop
  useEffect(() => {
    if (store.isEmpty && store.events.length === 0) {
      resetEmptyState();
      let running = true;
      const loop = () => {
        if (!running) return;
        render();
        emptyAnimRef.current = requestAnimationFrame(loop);
      };
      emptyAnimRef.current = requestAnimationFrame(loop);
      return () => {
        running = false;
        cancelAnimationFrame(emptyAnimRef.current);
      };
    }
  }, [store.isEmpty, render]);

  // Read from store for toolbar (triggered by toolbarVersion bumps)
  const toolbarGroups = store.groups;
  const toolbarEventCount = store.events.length;
  const focusedGroup = store.getFocusedGroup(focusedGroupId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: BG }}>
      <div ref={containerRef} className="relative flex-1" style={{ minHeight: 300 }}>
        <canvas ref={canvasRef} className="absolute inset-0" />

        {focusedGroupId && (
          <button
            onClick={() => { focusedGroupRef.current = null; setFocusedGroupId(null); setSelectedEvent(null); store.groups.forEach(packEventsInGroup); requestRender(); }}
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
        groups={toolbarGroups}
        eventCount={toolbarEventCount}
        focusedGroup={focusedGroup}
        selectedGroupId={selectedGroupId}
        onFitToView={fitToView}
        visibleTypes={visibleTypes}
        onToggleType={toggleType}
      />
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState, useCallback, useReducer, useSyncExternalStore } from 'react';
import * as d3 from 'd3';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { BrainEvent, Group, UndoEntry, SignalType, FilterState } from './lib/types';
import { BG } from './lib/constants';
import { renderBackground, type RenderContext } from './lib/canvasRenderPipeline';
import { packEventsInGroup } from './lib/canvasLayout';
import { CanvasStore } from './lib/canvasStore';
import { useCanvasData } from './lib/useCanvasData';
import { renderFocused } from './lib/renderFocused';
import { renderOverview } from './lib/renderOverview';
import { useCanvasInteraction } from './lib/useCanvasInteraction';
import { EventDetailDrawer } from './components/EventDetailDrawer';
import { CanvasToolbar } from './components/CanvasToolbar';
import { UndoToasts } from './components/UndoToasts';
import { canvasReducer, createInitialCanvasState } from './lib/canvasStateReducer';
import BrainEmptyState from '../components/BrainEmptyState';

const ALL_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

interface EventCanvasD3Props {
  /** When false, signal polling is paused. Defaults to true. */
  enabled?: boolean;
}

export default function EventCanvasD3({ enabled = true }: EventCanvasD3Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimRef = useRef({ width: 800, height: 500 });
  const animRef = useRef<number>(0);
  const groupsRef = useRef<Group[]>([]);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const momentumAnimRef = useRef<number>(0);
  const filterStateRef = useRef<FilterState>({ visibleTypes: new Set(ALL_TYPES) });

  // ── Canvas state machine (replaces scattered refs) ──
  const [canvasState, dispatch] = useReducer(canvasReducer, undefined, createInitialCanvasState);

  // ── External store (events/groups live here, subscribed via useSyncExternalStore) ──
  const storeRef = useRef<CanvasStore>(null!);
  if (!storeRef.current) {
    storeRef.current = new CanvasStore();
  }
  const store = storeRef.current;

  // Subscribe to store snapshot declaratively — replaces the imperative
  // onRender callback + toolbarVersion hack. When store data changes
  // (events, groups, layout progress), React re-renders this component.
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // ── React state: UI-only concerns ────────────────────────────────
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [visibleTypes, setVisibleTypes] = useState<Set<SignalType>>(new Set(ALL_TYPES));

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

  // ── Render callback (reads from canvas state + store) ────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimRef.current;
    const dpr = window.devicePixelRatio || 1;
    const { transform, focusedGroupId, selectedGroupId } = canvasState;
    const currentGroups = store.groups;
    const filterState = filterStateRef.current;

    // Keep store dimensions and groupsRef in sync
    store.setDimensions(width, height);
    groupsRef.current = currentGroups;

    // Empty state: handled by React overlay
    if (currentGroups.length === 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0f0f11';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Background + grid via shared pipeline pass
    const bgContext: RenderContext = { ctx, width, height, dpr, transform, now: Date.now(), filterState };
    renderBackground(bgContext, {
      gridOpacity: !focusedGroupId ? 0.06 : 0,
    });

    if (focusedGroupId) {
      const fg = currentGroups.find(g => g.id === focusedGroupId);
      if (fg) renderFocused({ ctx, group: fg, width, height, transform, dpr, filterState });
    } else {
      renderOverview({ ctx, groups: currentGroups, width, height, transform, dpr, selectedGroupId, filterState });
    }
  }, [store, canvasState]);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

  // Cleanup worker + pending undo timeouts on unmount
  useEffect(() => {
    return () => {
      store.destroy();
      setUndoStack(prev => { prev.forEach(u => clearTimeout(u.timeout)); return []; });
      pendingDeletesRef.current.clear();
    };
  }, [store]);

  // Re-render canvas when snapshot changes (store data updated)
  useEffect(() => { requestRender(); }, [snapshot, requestRender]);

  // Re-render on filter changes
  useEffect(() => { requestRender(); }, [visibleTypes, requestRender]);

  // Re-render when canvas state changes
  useEffect(() => { requestRender(); }, [canvasState, requestRender]);

  // ── Data fetching (pushes into store, subscribers are notified) ───
  const getFocusedGroupId = useCallback(() => canvasState.focusedGroupId, [canvasState.focusedGroupId]);
  useCanvasData({ store, getFocusedGroupId, enabled });

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

  // ── Delete / Undo (mutate store directly → subscribers notified) ──
  const pendingDeletesRef = useRef(new Set<string>());

  const handleDelete = useCallback((evt: BrainEvent) => {
    if (pendingDeletesRef.current.has(evt.id)) return; // double-delete guard
    pendingDeletesRef.current.add(evt.id);

    const groupId = canvasState.focusedGroupId; // capture at call-time
    store.removeEvent(evt.id, groupId);
    dispatch({ type: 'EventSelected', event: null });
    const timeout = setTimeout(() => {
      setUndoStack(prev => prev.filter(u => u.event.id !== evt.id));
      pendingDeletesRef.current.delete(evt.id);
      fetch(`/api/brain/signals?id=${evt.id}`, { method: 'DELETE' })
        .catch(() => {
          store.restoreEvent(evt, groupId);
        });
    }, 5000);
    setUndoStack(prev => [...prev, { event: evt, timeout, groupId }]);
  }, [store, canvasState.focusedGroupId]);

  const handleUndo = useCallback((entry: UndoEntry) => {
    clearTimeout(entry.timeout);
    pendingDeletesRef.current.delete(entry.event.id);
    setUndoStack(prev => prev.filter(u => u.event.id !== entry.event.id));
    store.restoreEvent(entry.event, entry.groupId);
  }, [store]);

  // Canvas interaction hook
  useCanvasInteraction({
    canvasRef, containerRef, canvasState, dispatch,
    dimRef, groupsRef, zoomBehaviorRef, momentumAnimRef,
    requestRender, fitToView,
  });

  // Read from snapshot for toolbar (no more toolbarVersion hack)
  const focusedGroup = store.getFocusedGroup(canvasState.focusedGroupId);

  const handleExitFocus = useCallback(() => {
    dispatch({ type: 'FocusExited' });
    store.groups.forEach(packEventsInGroup);
    requestRender();
  }, [dispatch, store, requestRender]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: BG }}>
      <div ref={containerRef} className="relative flex-1" style={{ minHeight: 300 }}>
        <canvas ref={canvasRef} className="absolute inset-0" />

        {snapshot.isEmpty && snapshot.events.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <BrainEmptyState
              icon={<Sparkles className="w-10 h-10 text-zinc-600" />}
              title="No signals yet"
              description="Brain collects signals from task execution, idea reviews & code activity."
            />
          </div>
        )}

        {canvasState.focusedGroupId && (
          <button
            onClick={handleExitFocus}
            className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/30 text-zinc-300 text-xs font-medium hover:bg-zinc-800/90 hover:border-zinc-600/40 hover:text-zinc-100 transition-all shadow-lg"
          >
            <ArrowLeft size={13} />
            <span>All Groups</span>
          </button>
        )}

        <EventDetailDrawer
          selectedEvent={canvasState.selectedEvent}
          onDelete={handleDelete}
          onClose={() => dispatch({ type: 'EventSelected', event: null })}
        />

        <UndoToasts undoStack={undoStack} onUndo={handleUndo} />
      </div>

      <CanvasToolbar
        zoomLevel={canvasState.zoomLevel}
        groups={snapshot.groups}
        eventCount={snapshot.events.length}
        focusedGroup={focusedGroup}
        selectedGroupId={canvasState.selectedGroupId}
        onFitToView={fitToView}
        visibleTypes={visibleTypes}
        onToggleType={toggleType}
      />
    </div>
  );
}

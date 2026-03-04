import { useEffect, useCallback, useRef, Dispatch } from 'react';
import * as d3 from 'd3';
import type { BrainEvent, Group } from './types';
import type { CanvasAction, CanvasState } from './canvasStateReducer';
import { FOCUS_ZOOM_THRESHOLD } from './constants';
import { layoutFocusedGroup, runForceLayout, packEventsInGroup, queryNearest } from './canvasLayout';

interface UseCanvasInteractionParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasState: CanvasState;
  dispatch: Dispatch<CanvasAction>;
  dimRef: React.MutableRefObject<{ width: number; height: number }>;
  groupsRef: React.MutableRefObject<Group[]>;
  zoomBehaviorRef: React.MutableRefObject<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>;
  momentumAnimRef: React.MutableRefObject<number>;
  requestRender: () => void;
  fitToView: () => void;
}

export function useCanvasInteraction({
  canvasRef, containerRef, canvasState, dispatch,
  dimRef, groupsRef, zoomBehaviorRef, momentumAnimRef,
  requestRender, fitToView,
}: UseCanvasInteractionParams) {

  const findGroupAtCursor = useCallback((): Group | null => {
    const { transform, cursor } = canvasState;
    const dataX = (cursor.x - transform.x) / transform.k;
    const dataY = (cursor.y - transform.y) / transform.k;
    for (const group of groupsRef.current) {
      const dx = dataX - group.x;
      const dy = dataY - group.y;
      if (dx * dx + dy * dy <= group.radius * group.radius) return group;
    }
    return null;
  }, [canvasState, groupsRef]);

  const findEventAt = useCallback((screenX: number, screenY: number): BrainEvent | null => {
    const { transform, focusedGroupId } = canvasState;

    if (focusedGroupId) {
      // Focused mode: layout uses screen coords directly.
      // evt.x is in layout space (transformed via t.k + t.x to screen).
      // evt.y is in screen space directly.
      // We query using layout-space coords for consistency with the spatial index.
      const group = groupsRef.current.find(g => g.id === focusedGroupId);
      if (!group) return null;

      const queryX = (screenX - transform.x) / transform.k;
      const queryY = screenY;

      if (group.spatialIndex) {
        const candidate = queryNearest(group.spatialIndex, queryX, queryY, Infinity);
        if (!candidate) return null;
        // Verify in screen space for accuracy
        const ex = candidate.x * transform.k + transform.x - screenX;
        const ey = candidate.y - screenY;
        return (ex * ex + ey * ey <= 20 ** 2) ? candidate : null;
      }
      // Fallback linear scan
      let closest: BrainEvent | null = null;
      let closestDist = 20 ** 2;
      for (const evt of group.events) {
        const ex = evt.x * transform.k + transform.x - screenX;
        const ey = evt.y - screenY;
        const dist = ex * ex + ey * ey;
        if (dist < closestDist) { closestDist = dist; closest = evt; }
      }
      return closest;
    }

    // Overview mode: convert screen to data coords
    const dataX = (screenX - transform.x) / transform.k;
    const dataY = (screenY - transform.y) / transform.k;
    const threshold = (15 / transform.k) ** 2;

    // Use spatial index per group
    let best: BrainEvent | null = null;
    let bestDist = threshold;
    for (const group of groupsRef.current) {
      if (group.spatialIndex) {
        const candidate = queryNearest(group.spatialIndex, dataX, dataY, bestDist);
        if (candidate) {
          const ex = candidate.x - dataX;
          const ey = candidate.y - dataY;
          const dist = ex * ex + ey * ey;
          if (dist < bestDist) { bestDist = dist; best = candidate; }
        }
      } else {
        // Fallback linear scan for groups without index
        for (const evt of group.events) {
          const ex = evt.x - dataX;
          const ey = evt.y - dataY;
          const dist = ex * ex + ey * ey;
          if (dist < bestDist) { bestDist = dist; best = evt; }
        }
      }
    }
    return best;
  }, [canvasState, groupsRef]);

  const enterFocus = useCallback((group: Group) => {
    if (momentumAnimRef.current) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = 0; }
    const { width, height } = dimRef.current;
    dispatch({ type: 'FocusEntered', groupId: group.id });
    layoutFocusedGroup(group, width, height);
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
  }, [dispatch, momentumAnimRef, dimRef, canvasRef, zoomBehaviorRef]);

  const exitFocus = useCallback(() => {
    if (momentumAnimRef.current) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = 0; }
    dispatch({ type: 'FocusExited' });
    const currentGroups = groupsRef.current;
    currentGroups.forEach(packEventsInGroup);
    const canvas = canvasRef.current;
    if (canvas && zoomBehaviorRef.current) {
      const { width, height } = dimRef.current;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const g of currentGroups) {
        minX = Math.min(minX, g.x - g.radius); minY = Math.min(minY, g.y - g.radius);
        maxX = Math.max(maxX, g.x + g.radius); maxY = Math.max(maxY, g.y + g.radius);
      }
      const bboxW = maxX - minX; const bboxH = maxY - minY;
      if (bboxW > 0 && bboxH > 0) {
        const scale = Math.min(width * 0.84 / bboxW, height * 0.84 / bboxH, 2.0);
        const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
        const tx = width / 2 - cx * scale; const ty = height / 2 - cy * scale;
        const sel = d3.select(canvas);
        (sel as any).transition().duration(500).call(
          zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }
  }, [dispatch, momentumAnimRef, groupsRef, canvasRef, zoomBehaviorRef, dimRef]);

  // Main setup effect
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Cached bounding rect — updated on resize, read in event handlers
    let cachedRect = canvas.getBoundingClientRect();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth; const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      dimRef.current = { width: w, height: h };
      cachedRect = canvas.getBoundingClientRect();
      const currentGroups = groupsRef.current;
      if (currentGroups.length > 0) {
        if (canvasState.focusedGroupId) {
          const fg = currentGroups.find(g => g.id === canvasState.focusedGroupId);
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

    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 8])
      .filter((event: any) => { if (event.type === 'wheel') return false; return !event.ctrlKey && !event.button; })
      .on('zoom', (event) => {
        const prevK = canvasState.transform.k;
        const k = event.transform.k;
        dispatch({ type: 'ZoomChanged', transform: event.transform, zoomLevel: k });
        if (!canvasState.focusedGroupId && prevK < FOCUS_ZOOM_THRESHOLD && k >= FOCUS_ZOOM_THRESHOLD) {
          const group = findGroupAtCursor();
          if (group) { enterFocus(group); return; }
        }
        if (canvasState.focusedGroupId && k < 0.6) { exitFocus(); return; }
        requestRender();
      });

    zoomBehaviorRef.current = zoomBehavior;
    (d3.select(canvas) as any).call(zoomBehavior);

    // Momentum scroll
    const IMMEDIATE_FRACTION = 0.5;
    const MOMENTUM_DRAIN = 0.25;
    const MOMENTUM_THRESHOLD = 0.00008;

    // Store momentum in a ref for the animation loop (avoid dispatch on every frame)
    const momentumRef = useRef(0);

    const applyZoomDelta = (delta: number) => {
      if (!zoomBehaviorRef.current) return;
      const { transform, zoomCenter } = canvasState;
      const newK = Math.max(0.2, Math.min(8, transform.k * Math.pow(2, delta)));
      if (newK === transform.k) return;
      const ratio = newK / transform.k;
      const newTransform = d3.zoomIdentity.translate(
        zoomCenter.x - (zoomCenter.x - transform.x) * ratio,
        zoomCenter.y - (zoomCenter.y - transform.y) * ratio
      ).scale(newK);
      zoomBehaviorRef.current.transform(d3.select(canvas) as any, newTransform);
    };

    const momentumLoop = () => {
      const m = momentumRef.current;
      if (Math.abs(m) < MOMENTUM_THRESHOLD) {
        momentumRef.current = 0;
        momentumAnimRef.current = 0;
        dispatch({ type: 'MomentumReset' });
        return;
      }
      const frameDelta = m * MOMENTUM_DRAIN;
      momentumRef.current -= frameDelta;
      applyZoomDelta(frameDelta);
      momentumAnimRef.current = requestAnimationFrame(momentumLoop);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomCenter = { x: e.clientX - cachedRect.left, y: e.clientY - cachedRect.top };
      dispatch({ type: 'ZoomCenterSet', x: zoomCenter.x, y: zoomCenter.y });
      const rawDelta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1.0 : 0.002);
      if (momentumRef.current !== 0 && Math.sign(rawDelta) !== Math.sign(momentumRef.current)) {
        momentumRef.current = 0;
      }
      applyZoomDelta(rawDelta * IMMEDIATE_FRACTION);
      momentumRef.current += rawDelta * (1 - IMMEDIATE_FRACTION);
      if (!momentumAnimRef.current) momentumAnimRef.current = requestAnimationFrame(momentumLoop);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    const handleClick = (e: MouseEvent) => {
      const mx = e.clientX - cachedRect.left; const my = e.clientY - cachedRect.top;
      if (!canvasState.focusedGroupId) {
        const { transform } = canvasState;
        const dataX = (mx - transform.x) / transform.k; const dataY = (my - transform.y) / transform.k;
        for (const group of groupsRef.current) {
          const dx = dataX - group.x; const dy = dataY - group.y;
          if (dx * dx + dy * dy <= group.radius * group.radius) {
            if (!findEventAt(mx, my)) {
              dispatch({ type: 'GroupSelected', groupId: group.id });
              requestRender();
              return;
            }
          }
        }
      }
      dispatch({ type: 'EventSelected', event: findEventAt(mx, my) });
    };

    canvas.addEventListener('click', handleClick);

    let mouseMoveRafPending = false;
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - cachedRect.left;
      const y = e.clientY - cachedRect.top;
      dispatch({ type: 'CursorMoved', x, y });
      if (mouseMoveRafPending) return;
      mouseMoveRafPending = true;
      requestAnimationFrame(() => {
        mouseMoveRafPending = false;
        const found = findEventAt(x, y);
        if (found) canvas.style.cursor = 'pointer';
        else if (!canvasState.focusedGroupId) canvas.style.cursor = findGroupAtCursor() ? 'pointer' : 'grab';
        else canvas.style.cursor = 'grab';
      });
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
  }, [requestRender, fitToView, findEventAt, findGroupAtCursor, enterFocus, exitFocus,
      canvasRef, containerRef, canvasState, dispatch, dimRef, groupsRef,
      zoomBehaviorRef, momentumAnimRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (canvasState.focusedGroupId) {
        if (e.key === 'Escape') { e.preventDefault(); exitFocus(); }
        return;
      }
      const groups = groupsRef.current;
      if (groups.length === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = groups.findIndex(g => g.id === canvasState.selectedGroupId);
        const next = idx < 0 ? 0 : (idx + 1) % groups.length;
        dispatch({ type: 'GroupSelected', groupId: groups[next].id });
        requestRender();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = groups.findIndex(g => g.id === canvasState.selectedGroupId);
        const next = idx <= 0 ? groups.length - 1 : idx - 1;
        dispatch({ type: 'GroupSelected', groupId: groups[next].id });
        requestRender();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const group = groups.find(g => g.id === canvasState.selectedGroupId);
        if (group) {
          dispatch({ type: 'GroupSelected', groupId: null });
          enterFocus(group);
        }
      } else if (e.key === 'Escape' && canvasState.selectedGroupId) {
        e.preventDefault();
        dispatch({ type: 'GroupSelected', groupId: null });
        requestRender();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestRender, enterFocus, exitFocus, canvasState, dispatch, groupsRef]);
}

import { useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import type { BrainEvent, Group } from './types';
import { FOCUS_ZOOM_THRESHOLD } from './constants';
import { layoutFocusedGroup, runForceLayout, packEventsInGroup } from './layout';

interface UseCanvasInteractionParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
  dimRef: React.MutableRefObject<{ width: number; height: number }>;
  groupsRef: React.MutableRefObject<Group[]>;
  focusedGroupRef: React.MutableRefObject<string | null>;
  selectedGroupRef: React.MutableRefObject<string | null>;
  cursorRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomBehaviorRef: React.MutableRefObject<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>;
  momentumRef: React.MutableRefObject<number>;
  momentumAnimRef: React.MutableRefObject<number>;
  zoomCenterRef: React.MutableRefObject<{ x: number; y: number }>;
  setZoomLevel: (level: number) => void;
  setFocusedGroupId: (id: string | null) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSelectedEvent: (event: BrainEvent | null) => void;
  requestRender: () => void;
  fitToView: () => void;
}

export function useCanvasInteraction({
  canvasRef, containerRef, transformRef, dimRef, groupsRef,
  focusedGroupRef, selectedGroupRef, cursorRef,
  zoomBehaviorRef, momentumRef, momentumAnimRef, zoomCenterRef,
  setZoomLevel, setFocusedGroupId, setSelectedGroupId, setSelectedEvent,
  requestRender, fitToView,
}: UseCanvasInteractionParams) {

  const findGroupAtCursor = useCallback((): Group | null => {
    const t = transformRef.current;
    const { x: sx, y: sy } = cursorRef.current;
    const dataX = (sx - t.x) / t.k;
    const dataY = (sy - t.y) / t.k;
    for (const group of groupsRef.current) {
      const dx = dataX - group.x;
      const dy = dataY - group.y;
      if (dx * dx + dy * dy <= group.radius * group.radius) return group;
    }
    return null;
  }, [transformRef, cursorRef, groupsRef]);

  const findEventAt = useCallback((screenX: number, screenY: number): BrainEvent | null => {
    const t = transformRef.current;
    const focusId = focusedGroupRef.current;
    let closest: BrainEvent | null = null;
    let closestDist = Infinity;

    if (focusId) {
      const threshold = 20 ** 2;
      for (const group of groupsRef.current.filter(g => g.id === focusId)) {
        for (const evt of group.events) {
          const evtScreenX = evt.x * t.k + t.x;
          const ex = evtScreenX - screenX;
          const ey = evt.y - screenY;
          const dist = ex * ex + ey * ey;
          if (dist < closestDist && dist < threshold) { closestDist = dist; closest = evt; }
        }
      }
    } else {
      const dataX = (screenX - t.x) / t.k;
      const dataY = (screenY - t.y) / t.k;
      const threshold = (15 / t.k) ** 2;
      for (const group of groupsRef.current) {
        for (const evt of group.events) {
          const ex = evt.x - dataX;
          const ey = evt.y - dataY;
          const dist = ex * ex + ey * ey;
          if (dist < closestDist && dist < threshold) { closestDist = dist; closest = evt; }
        }
      }
    }
    return closest;
  }, [transformRef, focusedGroupRef, groupsRef]);

  const enterFocus = useCallback((group: Group) => {
    momentumRef.current = 0;
    if (momentumAnimRef.current) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = 0; }
    const { width, height } = dimRef.current;
    focusedGroupRef.current = group.id;
    setFocusedGroupId(group.id);
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
  }, [momentumRef, momentumAnimRef, dimRef, focusedGroupRef, setFocusedGroupId, canvasRef, zoomBehaviorRef]);

  const exitFocus = useCallback(() => {
    momentumRef.current = 0;
    if (momentumAnimRef.current) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = 0; }
    focusedGroupRef.current = null;
    setFocusedGroupId(null);
    setSelectedEvent(null);
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
  }, [momentumRef, momentumAnimRef, focusedGroupRef, setFocusedGroupId, setSelectedEvent, groupsRef, canvasRef, zoomBehaviorRef, dimRef]);

  // Main setup effect
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth; const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
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

    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 8])
      .filter((event: any) => { if (event.type === 'wheel') return false; return !event.ctrlKey && !event.button; })
      .on('zoom', (event) => {
        const prevK = transformRef.current.k;
        transformRef.current = event.transform;
        const k = event.transform.k;
        setZoomLevel(k);
        if (!focusedGroupRef.current && prevK < FOCUS_ZOOM_THRESHOLD && k >= FOCUS_ZOOM_THRESHOLD) {
          const group = findGroupAtCursor();
          if (group) { enterFocus(group); return; }
        }
        if (focusedGroupRef.current && k < 0.6) { exitFocus(); return; }
        requestRender();
      });

    zoomBehaviorRef.current = zoomBehavior;
    (d3.select(canvas) as any).call(zoomBehavior);

    // Momentum scroll
    const IMMEDIATE_FRACTION = 0.5;
    const MOMENTUM_DRAIN = 0.25;
    const MOMENTUM_THRESHOLD = 0.00008;

    const applyZoomDelta = (delta: number) => {
      if (!zoomBehaviorRef.current) return;
      const t = transformRef.current;
      const { x: px, y: py } = zoomCenterRef.current;
      const newK = Math.max(0.2, Math.min(8, t.k * Math.pow(2, delta)));
      if (newK === t.k) return;
      const ratio = newK / t.k;
      const newTransform = d3.zoomIdentity.translate(px - (px - t.x) * ratio, py - (py - t.y) * ratio).scale(newK);
      zoomBehaviorRef.current.transform(d3.select(canvas) as any, newTransform);
    };

    const momentumLoop = () => {
      const m = momentumRef.current;
      if (Math.abs(m) < MOMENTUM_THRESHOLD) { momentumRef.current = 0; momentumAnimRef.current = 0; return; }
      const frameDelta = m * MOMENTUM_DRAIN;
      momentumRef.current -= frameDelta;
      applyZoomDelta(frameDelta);
      momentumAnimRef.current = requestAnimationFrame(momentumLoop);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomCenterRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const rawDelta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1.0 : 0.002);
      if (momentumRef.current !== 0 && Math.sign(rawDelta) !== Math.sign(momentumRef.current)) momentumRef.current = 0;
      applyZoomDelta(rawDelta * IMMEDIATE_FRACTION);
      momentumRef.current += rawDelta * (1 - IMMEDIATE_FRACTION);
      if (!momentumAnimRef.current) momentumAnimRef.current = requestAnimationFrame(momentumLoop);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      if (!focusedGroupRef.current) {
        const t = transformRef.current;
        const dataX = (mx - t.x) / t.k; const dataY = (my - t.y) / t.k;
        for (const group of groupsRef.current) {
          const dx = dataX - group.x; const dy = dataY - group.y;
          if (dx * dx + dy * dy <= group.radius * group.radius) {
            if (!findEventAt(mx, my)) {
              selectedGroupRef.current = group.id;
              setSelectedGroupId(group.id);
              requestRender();
              return;
            }
          }
        }
      }
      setSelectedEvent(findEventAt(mx, my));
    };

    canvas.addEventListener('click', handleClick);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const found = findEventAt(cursorRef.current.x, cursorRef.current.y);
      if (found) canvas.style.cursor = 'pointer';
      else if (!focusedGroupRef.current) canvas.style.cursor = findGroupAtCursor() ? 'pointer' : 'grab';
      else canvas.style.cursor = 'grab';
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
      canvasRef, containerRef, transformRef, dimRef, groupsRef, focusedGroupRef,
      selectedGroupRef, cursorRef, zoomBehaviorRef, momentumRef, momentumAnimRef,
      zoomCenterRef, setZoomLevel, setSelectedGroupId, setSelectedEvent]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusedGroupRef.current) {
        if (e.key === 'Escape') { e.preventDefault(); exitFocus(); }
        return;
      }
      const groups = groupsRef.current;
      if (groups.length === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = groups.findIndex(g => g.id === selectedGroupRef.current);
        const next = idx < 0 ? 0 : (idx + 1) % groups.length;
        selectedGroupRef.current = groups[next].id;
        setSelectedGroupId(groups[next].id);
        requestRender();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = groups.findIndex(g => g.id === selectedGroupRef.current);
        const next = idx <= 0 ? groups.length - 1 : idx - 1;
        selectedGroupRef.current = groups[next].id;
        setSelectedGroupId(groups[next].id);
        requestRender();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const group = groups.find(g => g.id === selectedGroupRef.current);
        if (group) { selectedGroupRef.current = null; setSelectedGroupId(null); enterFocus(group); }
      } else if (e.key === 'Escape' && selectedGroupRef.current) {
        e.preventDefault();
        selectedGroupRef.current = null; setSelectedGroupId(null); requestRender();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestRender, enterFocus, exitFocus, focusedGroupRef, groupsRef, selectedGroupRef, setSelectedGroupId]);
}

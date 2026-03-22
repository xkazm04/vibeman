import type { Group, FilterState } from './types';
import { COLORS, LABELS, LANE_TYPES } from './constants';
import { colorAt } from './helpers';
import { executeRenderPipeline, type RenderContext } from './canvasRenderPipeline';
import { DISPLAY_FONT, DATA_FONT } from '../../lib/brainFonts';

// --- Cached lane background OffscreenCanvas ---
let _laneCache: OffscreenCanvas | null = null;
let _laneCacheKey = '';

function getLaneCacheKey(width: number, height: number, filterState?: FilterState): string {
  const typeKey = filterState ? Array.from(filterState.visibleTypes).sort().join(',') : 'all';
  return `${width}:${height}:${typeKey}`;
}

function getLaneBackground(width: number, height: number, filterState?: FilterState): OffscreenCanvas {
  const key = getLaneCacheKey(width, height, filterState);
  if (_laneCache && _laneCacheKey === key) return _laneCache;

  const oc = new OffscreenCanvas(width, height);
  const octx = oc.getContext('2d')!;

  const yTop = height * 0.06;
  const yBottom = height * 0.08;
  const laneHeight = (height - yTop - yBottom) / LANE_TYPES.length;

  for (let i = 0; i < LANE_TYPES.length; i++) {
    const laneY = yTop + i * laneHeight;
    const laneColor = COLORS[LANE_TYPES[i]];
    const laneVisible = !filterState || filterState.visibleTypes.has(LANE_TYPES[i]);

    octx.save();
    octx.globalAlpha = laneVisible ? 0.04 : 0.015;
    octx.fillStyle = laneColor;
    octx.fillRect(0, laneY, width, laneHeight);
    octx.restore();

    octx.strokeStyle = colorAt(laneColor, 0.15);
    octx.lineWidth = 1;
    octx.beginPath();
    octx.moveTo(0, laneY);
    octx.lineTo(width, laneY);
    octx.stroke();

    octx.fillStyle = colorAt(laneColor, 0.08);
    octx.font = `bold ${Math.min(laneHeight * 0.35, 48)}px ${DISPLAY_FONT}`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(LABELS[LANE_TYPES[i]].toUpperCase(), width / 2, laneY + laneHeight / 2);

    octx.fillStyle = colorAt(laneColor, 0.6);
    octx.font = `bold 10px ${DISPLAY_FONT}`;
    octx.textAlign = 'left';
    octx.textBaseline = 'top';
    octx.fillText(LABELS[LANE_TYPES[i]], 10, laneY + 6);
  }

  // Bottom lane separator
  octx.strokeStyle = 'rgba(63,63,70,0.3)';
  octx.beginPath();
  octx.moveTo(0, yTop + LANE_TYPES.length * laneHeight);
  octx.lineTo(width, yTop + LANE_TYPES.length * laneHeight);
  octx.stroke();

  _laneCache = oc;
  _laneCacheKey = key;
  return oc;
}

interface RenderFocusedParams {
  ctx: CanvasRenderingContext2D;
  group: Group;
  width: number;
  height: number;
  transform: { x: number; y: number; k: number };
  dpr: number;
  filterState?: FilterState;
}

export function renderFocused({ ctx, group, width, height, transform, dpr, filterState }: RenderFocusedParams): void {
  const k = transform.k;
  const yTop = height * 0.06;
  const yBottom = height * 0.08;
  const laneHeight = (height - yTop - yBottom) / LANE_TYPES.length;
  const xPad = width * 0.10;
  const xRange = width - xPad * 2;

  // Lane backgrounds — blit from cached OffscreenCanvas
  ctx.drawImage(getLaneBackground(width, height, filterState), 0, 0);

  // Time axis
  renderTimeAxis(ctx, group, width, height, yTop, yBottom, xPad, xRange, laneHeight, transform);

  // Build render context
  const renderContext: RenderContext = {
    ctx,
    width,
    height,
    dpr,
    transform,
    now: Date.now(),
    filterState,
  };

  // Execute render pipeline
  executeRenderPipeline(renderContext, {
    connectionLines: {
      events: group.sortedEvents,
      mode: 'sequential',
      coordinateMode: 'screen',
      color: colorAt(group.dominantColor, 0.08),
    },
    eventDots: k < 1.5 ? {
      events: group.events,
      coordinateMode: 'screen',
      dotScale: 1.0,
      enablePulse: true,
      enableGlow: true,
    } : undefined,
    eventCards: k >= 1.5 ? {
      events: group.events,
      coordinateMode: 'screen',
      cardSize: { width: 180, height: 64 },
    } : undefined,
    smartLabels: k < 1.5 ? {
      events: group.events,
      coordinateMode: 'screen',
      maxLabels: Math.min(12, Math.ceil(group.events.length * 0.4)),
    } : undefined,
    overlay: {
      header: {
        title: group.name,
        subtitle: `${group.events.length} events  ·  Timeline  ·  Scroll to navigate`,
        color: group.dominantColor,
      },
      vignette: {
        left: 60,
        right: 60,
      },
    },
  });
}

function renderTimeAxis(
  ctx: CanvasRenderingContext2D, group: Group,
  width: number, height: number,
  yTop: number, yBottom: number,
  xPad: number, xRange: number, laneHeight: number,
  transform: { x: number; y: number; k: number }
): void {
  if (group.events.length === 0) return;
  const k = transform.k;

  const minTs = Math.min(...group.events.map(e => e.timestamp));
  const maxTs = Math.max(...group.events.map(e => e.timestamp));
  const span = Math.max(maxTs - minTs, 3600000);
  const padSpan = span * 0.05;
  const axisY = height - yBottom + 16;

  const axisStartX = xPad * k + transform.x;
  const axisEndX = (xPad + xRange) * k + transform.x;
  ctx.strokeStyle = 'rgba(63,63,70,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(axisStartX, axisY);
  ctx.lineTo(axisEndX, axisY);
  ctx.stroke();

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const firstMonday = (() => {
    const d = new Date(minTs - padSpan);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + daysToMonday);
    return d.getTime();
  })();

  ctx.font = `9px ${DATA_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const totalSpan = span + padSpan * 2;
  let weekStart = firstMonday;
  while (weekStart <= maxTs + padSpan + WEEK_MS) {
    const frac = (weekStart - minTs + padSpan) / totalSpan;
    const dataX = xPad + frac * xRange;
    const screenGridX = dataX * k + transform.x;

    if (screenGridX > -20 && screenGridX < width + 20) {
      ctx.strokeStyle = 'rgba(63,63,70,0.2)';
      ctx.beginPath();
      ctx.moveTo(screenGridX, yTop);
      ctx.lineTo(screenGridX, yTop + LANE_TYPES.length * laneHeight);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(63,63,70,0.8)';
      ctx.beginPath();
      ctx.moveTo(screenGridX, axisY);
      ctx.lineTo(screenGridX, axisY + 5);
      ctx.stroke();

      const weekDate = new Date(weekStart);
      const label = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(label, screenGridX, axisY + 8);

      const weekNum = Math.ceil(((weekStart - new Date(weekDate.getFullYear(), 0, 1).getTime()) / WEEK_MS)) + 1;
      ctx.fillStyle = 'rgba(113,113,122,0.5)';
      ctx.font = `8px ${DATA_FONT}`;
      ctx.fillText(`W${weekNum}`, screenGridX, axisY + 20);
      ctx.font = `9px ${DATA_FONT}`;
    }
    weekStart += WEEK_MS;
  }
}

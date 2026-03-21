/**
 * Shared Canvas Render Pipeline
 *
 * Extracts ~600 LOC of duplication from renderFocused/renderOverview/EventCanvasTimeline
 * into composable, typed render passes.
 */

import type { BrainEvent, Group, FilterState } from './types';
import { COLORS, RECENCY_GLOW_HOURS, LABEL_MIN_ZOOM } from './constants';
import { getEventAlpha, getEventRadius, computeLabelRects, colorAt } from './helpers';
import { DISPLAY_FONT } from '../../lib/brainFonts';

// ─── RenderContext: Shared state passed to all render passes ──────────────

export interface RenderContext {
  /** Canvas 2D context */
  ctx: CanvasRenderingContext2D;
  /** Canvas width (logical pixels) */
  width: number;
  /** Canvas height (logical pixels) */
  height: number;
  /** Device pixel ratio */
  dpr: number;
  /** Zoom/pan transform */
  transform: { x: number; y: number; k: number };
  /** Current timestamp (ms) for recency calculations */
  now: number;
  /** Filter state (visible types) */
  filterState?: FilterState;
}

// ─── RenderPass: Type-safe render stage ───────────────────────────────────

export type RenderPassFn<TConfig = unknown> = (
  context: RenderContext,
  config: TConfig
) => void;

// ─── World Transform Utility ──────────────────────────────────────────────

/**
 * Execute a drawing callback inside a world-coordinate transform.
 * Saves/restores canvas state and applies dpr-scaled zoom+pan transform.
 */
export function withWorldTransform(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  transform: { x: number; y: number; k: number },
  fn: () => void,
): void {
  ctx.save();
  ctx.setTransform(dpr * transform.k, 0, 0, dpr * transform.k, dpr * transform.x, dpr * transform.y);
  fn();
  ctx.restore();
}

// ─── Background Pass ──────────────────────────────────────────────────────

export interface BackgroundConfig {
  /** Background gradient colors */
  gradient?: { from: string; to: string };
  /** Grid opacity (0 = hidden, 1 = full) */
  gridOpacity?: number;
  /** Grid cell size (in data space) */
  gridSize?: number;
}

export const renderBackground: RenderPassFn<BackgroundConfig> = (
  { ctx, width, height, transform, dpr },
  config = {}
) => {
  const {
    gradient = { from: '#141418', to: '#0a0a0c' },
    gridOpacity = 0.06,
    gridSize = 60,
  } = config;

  const k = transform.k;

  // Background gradient
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7
  );
  bgGrad.addColorStop(0, gradient.from);
  bgGrad.addColorStop(1, gradient.to);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Grid (only at sufficient zoom)
  if (gridOpacity > 0 && k > 0.4) {
    ctx.strokeStyle = `rgba(63,63,70,${gridOpacity})`;
    ctx.lineWidth = 1;
    const ox = transform.x % (gridSize * k);
    const oy = transform.y % (gridSize * k);
    for (let gx = ox; gx < width; gx += gridSize * k) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = oy; gy < height; gy += gridSize * k) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
  }
};

// ─── Event Dots Pass ──────────────────────────────────────────────────────

export interface EventDotsConfig {
  /** Events to render */
  events: BrainEvent[];
  /** Coordinate transform mode */
  coordinateMode: 'world' | 'screen';
  /** Dot scale factor (applied after base radius calculation) */
  dotScale?: number;
  /** Enable recency pulse animation */
  enablePulse?: boolean;
  /** Enable glow/shadows for high-weight events */
  enableGlow?: boolean;
  /** Use radial gradients instead of solid fills */
  useGradients?: boolean;
}

export const renderEventDots: RenderPassFn<EventDotsConfig> = (
  { ctx, width, transform, filterState, now, dpr },
  config
) => {
  const {
    events,
    coordinateMode,
    dotScale = 1.0,
    enablePulse = true,
    enableGlow = true,
    useGradients = false,
  } = config;

  const k = transform.k;
  const pulsePhase = (now % 2000) / 2000;
  const pulseAlphaBase = 0.3 * (1 - pulsePhase);

  const draw = () => {
    for (const evt of events) {
      if (filterState && !filterState.visibleTypes.has(evt.type)) continue;

      const alpha = getEventAlpha(evt.timestamp);
      const evtColor = COLORS[evt.type];
      const baseRadius = getEventRadius(evt.weight, evt.timestamp);
      const dotRadius = (coordinateMode === 'world'
        ? baseRadius / Math.max(0.7, k * 0.5)
        : baseRadius * Math.min(k, 1.3)) * dotScale;

      const screenX = coordinateMode === 'screen' ? evt.x * k + transform.x : evt.x;
      const screenY = evt.y;

      if (coordinateMode === 'screen' && (screenX < -80 || screenX > width + 80)) {
        continue;
      }

      // Recency pulse
      if (enablePulse) {
        const ageHours = (now - evt.timestamp) / 3600000;
        if (ageHours < RECENCY_GLOW_HOURS) {
          const pulseRadius = dotRadius * (1.5 + pulsePhase * 0.8);
          ctx.beginPath();
          ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = colorAt(evtColor, pulseAlphaBase);
          ctx.lineWidth = coordinateMode === 'world' ? 1.5 / k : 1.5;
          ctx.stroke();
        }
      }

      // Glow halo for high-weight/recent events
      if (enableGlow && ((evt.weight > 1.0 && alpha > 0.5) || alpha > 0.8)) {
        ctx.save();
        ctx.shadowBlur = coordinateMode === 'world'
          ? (8 + evt.weight * 4) / k
          : 8 + evt.weight * 4;
        ctx.shadowColor = colorAt(evtColor, 0.5 * alpha);
        ctx.globalAlpha = 0.15 * alpha;
        ctx.fillStyle = evtColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Main dot fill (gradient or solid)
      if (useGradients) {
        const dotGrad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, dotRadius);
        dotGrad.addColorStop(0, colorAt(evtColor, Math.min(1, alpha + 0.3)));
        dotGrad.addColorStop(1, colorAt(evtColor, alpha * 0.6));
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        if (evt.weight > 1.2) {
          ctx.save();
          ctx.shadowBlur = coordinateMode === 'world' ? (8 + evt.weight * 2) / k : 8 + evt.weight * 2;
          ctx.shadowColor = colorAt(evtColor, 0.5);
          ctx.fillStyle = dotGrad;
          ctx.beginPath();
          ctx.arc(screenX, screenY, dotRadius * (evt.weight > 1.5 ? 0.35 : 0.8), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha + 0.15);
        ctx.fillStyle = evtColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (evt.weight > 1.5) {
          ctx.save();
          ctx.globalAlpha = 0.5 * alpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX, screenY, dotRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  };

  if (coordinateMode === 'world') {
    withWorldTransform(ctx, dpr, transform, draw);
  } else {
    draw();
  }
};

// ─── Event Cards Pass (high zoom) ─────────────────────────────────────────

export interface EventCardsConfig {
  /** Events to render */
  events: BrainEvent[];
  /** Coordinate transform mode */
  coordinateMode: 'world' | 'screen';
  /** Card dimensions */
  cardSize?: { width: number; height: number };
  /** Show context name vs summary */
  showContext?: boolean;
}

export const renderEventCards: RenderPassFn<EventCardsConfig> = (
  { ctx, width, transform, filterState, dpr },
  config
) => {
  const {
    events,
    coordinateMode,
    cardSize = { width: 180, height: 64 },
    showContext = false,
  } = config;

  const k = transform.k;

  const draw = () => {
    for (const evt of events) {
      if (filterState && !filterState.visibleTypes.has(evt.type)) continue;

      const alpha = getEventAlpha(evt.timestamp);
      const evtColor = COLORS[evt.type];

      const cardScale = coordinateMode === 'world' ? 1 : Math.min(k * 0.7, 1.4);
      const cardW = cardSize.width * cardScale;
      const cardH = cardSize.height * cardScale;

      const screenX = coordinateMode === 'screen' ? evt.x * k + transform.x : evt.x;
      const screenY = evt.y;

      if (coordinateMode === 'screen' && (screenX < -cardW || screenX > width + cardW)) {
        continue;
      }

      const cx = screenX - cardW / 2;
      const cy = screenY - cardH / 2;

      ctx.fillStyle = 'rgba(24,24,27,0.92)';
      ctx.strokeStyle = colorAt(evtColor, alpha * 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6 * cardScale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = evtColor;
      ctx.fillRect(cx + 5 * cardScale, cy + 7 * cardScale, 3 * cardScale, cardH - 14 * cardScale);

      ctx.fillStyle = '#f4f4f5';
      ctx.font = `600 ${Math.round(13 * cardScale)}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const titleText = showContext
        ? evt.context_name?.slice(0, 18) || evt.summary.slice(0, 28)
        : evt.summary.length > 28 ? evt.summary.slice(0, 27) + '..' : evt.summary;
      ctx.fillText(titleText, cx + 14 * cardScale, cy + 9 * cardScale);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = `${Math.round(10 * cardScale)}px ${DISPLAY_FONT}`;
      const metaText = showContext
        ? evt.summary.slice(0, 22)
        : `${COLORS[evt.type] ? evt.type : 'Event'}  ·  ${Math.round((Date.now() - evt.timestamp) / 3600000)}h ago`;
      ctx.fillText(metaText, cx + 14 * cardScale, cy + 28 * cardScale);

      const barY = cy + cardH - 11 * cardScale;
      ctx.fillStyle = 'rgba(63,63,70,0.5)';
      ctx.fillRect(cx + 14 * cardScale, barY, 80 * cardScale, 3 * cardScale);
      ctx.fillStyle = evtColor;
      ctx.fillRect(cx + 14 * cardScale, barY, (evt.weight / 2) * 80 * cardScale, 3 * cardScale);
    }
  };

  if (coordinateMode === 'world') {
    withWorldTransform(ctx, dpr, transform, draw);
  } else {
    draw();
  }
};

// ─── Connection Lines Pass ────────────────────────────────────────────────

export interface ConnectionLinesConfig {
  /** Events to connect */
  events: BrainEvent[];
  /** Connection mode */
  mode: 'sequential' | 'grouped';
  /** Coordinate transform mode */
  coordinateMode: 'world' | 'screen';
  /** Line color (auto if not provided) */
  color?: string;
  /** Line opacity */
  opacity?: number;
}

export const renderConnectionLines: RenderPassFn<ConnectionLinesConfig> = (
  { ctx, transform, filterState, dpr },
  config
) => {
  const {
    events,
    mode,
    coordinateMode,
    color,
    opacity = 0.08,
  } = config;

  const k = transform.k;

  const draw = () => {
    if (mode === 'sequential') {
      const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
      const lineColor = color || colorAt(COLORS[sorted[0]?.type] || '#a8a2c8', opacity);

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = coordinateMode === 'world' ? 1 / k : 1;

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        if (filterState && (!filterState.visibleTypes.has(prev.type) || !filterState.visibleTypes.has(curr.type))) {
          continue;
        }

        if (prev.type === curr.type) {
          const px = coordinateMode === 'screen' ? prev.x * k + transform.x : prev.x;
          const py = prev.y;
          const cx = coordinateMode === 'screen' ? curr.x * k + transform.x : curr.x;
          const cy = curr.y;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
      }
    } else {
      const groups = new Map<string, BrainEvent[]>();
      events.forEach(e => {
        if (filterState && !filterState.visibleTypes.has(e.type)) return;
        const key = `${e.type}::${e.context_name}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(e);
      });

      groups.forEach(evts => {
        if (evts.length < 2) return;
        const lineColor = color || colorAt(COLORS[evts[0].type], opacity);

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = coordinateMode === 'world' ? 0.5 / k : 0.5;
        ctx.setLineDash(coordinateMode === 'world' ? [4 / k, 4 / k] : [4, 4]);
        ctx.beginPath();

        evts.forEach((e, i) => {
          const x = coordinateMode === 'screen' ? e.x * k + transform.x : e.x;
          const y = e.y;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  };

  if (coordinateMode === 'world') {
    withWorldTransform(ctx, dpr, transform, draw);
  } else {
    draw();
  }
};

// ─── Smart Labels Pass ────────────────────────────────────────────────────

export interface SmartLabelsConfig {
  /** Events to label */
  events: BrainEvent[];
  /** Coordinate transform mode */
  coordinateMode: 'world' | 'screen';
  /** Maximum labels to render */
  maxLabels?: number;
  /** Font size (auto-scaled if not provided) */
  fontSize?: number;
  /** Minimum zoom to show labels */
  minZoom?: number;
}

export const renderSmartLabels: RenderPassFn<SmartLabelsConfig> = (
  { ctx, width, transform, filterState, dpr },
  config
) => {
  const {
    events,
    coordinateMode,
    maxLabels = 12,
    fontSize,
    minZoom = LABEL_MIN_ZOOM,
  } = config;

  const k = transform.k;

  if (k < minZoom) return;

  const draw = () => {
    const labelCandidates = events
      .filter(evt => !filterState || filterState.visibleTypes.has(evt.type))
      .map(evt => {
        const radius = getEventRadius(evt.weight, evt.timestamp);
        const scaledRadius = coordinateMode === 'world'
          ? radius / Math.max(0.7, k * 0.5)
          : radius * Math.min(k, 1.3);
        const alpha = getEventAlpha(evt.timestamp);

        return {
          x: evt.x,
          y: evt.y,
          radius: scaledRadius,
          label: evt.summary,
          priority: evt.weight * alpha,
        };
      });

    if (labelCandidates.length === 0) return;

    const labelFont = fontSize
      ? `500 ${fontSize}px ${DISPLAY_FONT}`
      : coordinateMode === 'world'
      ? `500 ${Math.max(8, Math.round(9 / k))}px ${DISPLAY_FONT}`
      : `500 ${Math.max(9, Math.round(11 * Math.min(k, 1.2)))}px ${DISPLAY_FONT}`;

    const rects = computeLabelRects(labelCandidates, ctx, labelFont, maxLabels);

    for (const rect of rects) {
      const pad = coordinateMode === 'world' ? 3 / k : 3;
      const roundRadius = coordinateMode === 'world' ? 3 / k : 3;

      ctx.fillStyle = 'rgba(15,15,17,0.75)';
      ctx.beginPath();
      ctx.roundRect(rect.x - pad, rect.y - 1, rect.width + pad * 2, rect.height + 2, roundRadius);
      ctx.fill();

      ctx.fillStyle = 'rgba(228,228,231,0.85)';
      ctx.font = labelFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(rect.label, rect.x, rect.y);
    }
  };

  if (coordinateMode === 'world') {
    withWorldTransform(ctx, dpr, transform, draw);
  } else {
    draw();
  }
};

// ─── Overlay Pass (vignettes, headers, hints) ─────────────────────────────

export interface OverlayConfig {
  /** Vignette edges */
  vignette?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Header content */
  header?: {
    title: string;
    subtitle?: string;
    color?: string;
  };
  /** Hint message */
  hint?: {
    text: string;
    yPosition?: number;
  };
}

export const renderOverlay: RenderPassFn<OverlayConfig> = (
  { ctx, width, height, dpr },
  config = {}
) => {
  const { vignette, header, hint } = config;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Vignette edges
  if (vignette) {
    if (vignette.top) {
      const vig = ctx.createLinearGradient(0, 0, 0, vignette.top);
      vig.addColorStop(0, 'rgba(10,10,12,0.5)');
      vig.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, vignette.top);
    }

    if (vignette.bottom) {
      const vig = ctx.createLinearGradient(0, height - vignette.bottom, 0, height);
      vig.addColorStop(0, 'rgba(10,10,12,0)');
      vig.addColorStop(1, 'rgba(10,10,12,0.5)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, height - vignette.bottom, width, vignette.bottom);
    }

    if (vignette.left) {
      const vig = ctx.createLinearGradient(0, 0, vignette.left, 0);
      vig.addColorStop(0, 'rgba(10,10,12,0.7)');
      vig.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, vignette.left, height);
    }

    if (vignette.right) {
      const vig = ctx.createLinearGradient(width - vignette.right, 0, width, 0);
      vig.addColorStop(0, 'rgba(10,10,12,0)');
      vig.addColorStop(1, 'rgba(10,10,12,0.7)');
      ctx.fillStyle = vig;
      ctx.fillRect(width - vignette.right, 0, vignette.right, height);
    }
  }

  // Header
  if (header) {
    const headerGrad = ctx.createLinearGradient(0, 0, 0, 48);
    headerGrad.addColorStop(0, 'rgba(10,10,12,0.9)');
    headerGrad.addColorStop(1, 'rgba(10,10,12,0)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, 48);

    ctx.fillStyle = header.color || '#f4f4f5';
    ctx.font = 'bold 14px ${DISPLAY_FONT}';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(header.title, width / 2, 12);

    if (header.subtitle) {
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px ${DISPLAY_FONT}';
      ctx.fillText(header.subtitle, width / 2, 32);
    }
  }

  // Hint
  if (hint) {
    ctx.font = '10px ${DISPLAY_FONT}';
    const hintWidth = ctx.measureText(hint.text).width + 24;
    const hintX = (width - hintWidth) / 2;
    const hintY = hint.yPosition ?? height - 54;

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
    ctx.fillText(hint.text, width / 2, hintY + 12);
  }
};

// ─── Pipeline Executor ────────────────────────────────────────────────────

export interface RenderPipelineConfig {
  background?: BackgroundConfig;
  eventDots?: EventDotsConfig;
  eventCards?: EventCardsConfig;
  connectionLines?: ConnectionLinesConfig;
  smartLabels?: SmartLabelsConfig;
  overlay?: OverlayConfig;
}

export function executeRenderPipeline(
  context: RenderContext,
  passes: RenderPipelineConfig
): void {
  // Execute passes in order
  if (passes.background) {
    renderBackground(context, passes.background);
  }

  if (passes.connectionLines) {
    renderConnectionLines(context, passes.connectionLines);
  }

  if (passes.eventDots) {
    renderEventDots(context, passes.eventDots);
  }

  if (passes.eventCards) {
    renderEventCards(context, passes.eventCards);
  }

  if (passes.smartLabels) {
    renderSmartLabels(context, passes.smartLabels);
  }

  if (passes.overlay) {
    renderOverlay(context, passes.overlay);
  }
}

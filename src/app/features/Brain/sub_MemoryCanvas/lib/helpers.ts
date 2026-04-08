import { DOT_RADIUS_MIN, DOT_RADIUS_MAX, LABEL_COLLISION_PADDING } from './constants';
import { COLORS } from './constants';
import type { SignalType, LabelRect } from './types';

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Pre-computed color lookup table keyed by (hex, alpha-bucket).
 * Alpha is quantized to 0.05 increments (21 buckets: 0.00..1.00).
 * Eliminates ~12,000 hexToRgba() calls/sec at 30fps with 200 events.
 */
const colorLUT = new Map<string, string>();

function buildColorLUT(): void {
  const allHexColors = new Set<string>();
  for (const c of Object.values(COLORS)) allHexColors.add(c);

  for (const hex of allHexColors) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    for (let bucket = 0; bucket <= 20; bucket++) {
      const a = Math.round(bucket * 5) / 100; // 0.00, 0.05, ... 1.00
      colorLUT.set(`${hex}:${bucket}`, `rgba(${r},${g},${b},${a})`);
    }
  }
}
buildColorLUT();

/** Fast rgba lookup using pre-computed LUT. Falls back to hexToRgba for unknown colors. */
export function colorAt(hex: string, alpha: number): string {
  const bucket = Math.round(Math.min(1, Math.max(0, alpha)) * 20);
  const key = `${hex}:${bucket}`;
  return colorLUT.get(key) ?? hexToRgba(hex, alpha);
}

/** Get the parsed RGB triple for a hex color (cached). */
const rgbCache = new Map<string, [number, number, number]>();
export function hexRgb(hex: string): [number, number, number] {
  let rgb = rgbCache.get(hex);
  if (!rgb) {
    rgb = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
    rgbCache.set(hex, rgb);
  }
  return rgb;
}

/**
 * Smooth exponential decay alpha based on event age.
 * ~1.0 at 0h, ~0.85 at 24h, ~0.55 at 72h, ~0.30 at 168h
 */
export function getEventAlpha(timestamp: number): number {
  const ageHours = (Date.now() - timestamp) / 3600000;
  return Math.max(0.25, Math.exp(-ageHours / 120));
}

/**
 * Compute event dot radius combining weight AND recency.
 * Recent events get a boost to stand out.
 */
export function getEventRadius(weight: number, timestamp: number, baseMin = DOT_RADIUS_MIN, baseMax = DOT_RADIUS_MAX): number {
  const ageHours = (Date.now() - timestamp) / 3600000;
  const recencyBoost = ageHours < 24 ? 1.3 : ageHours < 72 ? 1.1 : 1.0;
  const base = baseMin + (weight / 2.0) * (baseMax - baseMin);
  return base * recencyBoost;
}

export { formatRelativeTime as relTime } from '@/lib/formatDate';

// ─── Zoom-adaptive typography utilities ─────────────────────────────────

/** Clamp value between min and max. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Cubic ease-out: fast start, smooth deceleration. */
export function easeOutCubic(t: number): number {
  const t1 = 1 - t;
  return 1 - t1 * t1 * t1;
}

/**
 * Smooth zoom-adaptive font size using easeOutCubic.
 * Replaces hard `Math.round(base * Math.min(k, cap))` with a continuous curve.
 */
export function smoothFontSize(k: number, base: number): number {
  return base * easeOutCubic(clamp(k, 0.4, 3) / 3);
}

/**
 * Compute label opacity for smooth fade at low zoom levels.
 * Returns 0 below k=0.5, linearly ramps to 1 at k=0.7, stays 1 above.
 */
export function labelFadeAlpha(k: number): number {
  if (k >= 0.7) return 1;
  if (k <= 0.5) return 0;
  return (k - 0.5) / 0.2;
}

/**
 * MeasureText-based line-break algorithm for multi-line labels at high zoom.
 * Splits text into lines that fit within maxWidth.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  if (words.length === 0) return [text];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Greedy collision-aware label placement.
 * Returns labels that can be rendered without overlapping.
 */
export function computeLabelRects(
  candidates: Array<{ x: number; y: number; radius: number; label: string; priority: number }>,
  ctx: CanvasRenderingContext2D,
  font: string,
  maxLabels: number,
): LabelRect[] {
  if (candidates.length === 0) return [];

  // Sort by priority descending (high-weight recent events first)
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);

  const prevFont = ctx.font;
  ctx.font = font;

  const placed: LabelRect[] = [];
  const pad = LABEL_COLLISION_PADDING;

  for (const c of sorted) {
    if (placed.length >= maxLabels) break;

    const text = c.label.length > 22 ? c.label.slice(0, 21) + '..' : c.label;
    const metrics = ctx.measureText(text);
    const w = metrics.width;
    const h = 12; // approximate line height

    // Position label centered below the dot
    const lx = c.x - w / 2;
    const ly = c.y + c.radius + 4;

    // Check collision with all placed labels
    let collides = false;
    for (const p of placed) {
      if (
        lx - pad < p.x + p.width + pad &&
        lx + w + pad > p.x - pad &&
        ly - pad < p.y + p.height + pad &&
        ly + h + pad > p.y - pad
      ) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      placed.push({ x: lx, y: ly, width: w, height: h, priority: c.priority, label: text });
    }
  }

  ctx.font = prevFont;
  return placed;
}

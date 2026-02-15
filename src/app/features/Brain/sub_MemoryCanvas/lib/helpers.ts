import { DOT_RADIUS_MIN, DOT_RADIUS_MAX, LABEL_COLLISION_PADDING } from './constants';
import type { LabelRect } from './types';

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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

export function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

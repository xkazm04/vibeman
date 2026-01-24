import type { Group } from './types';
import { COLORS, LABELS, LANE_TYPES } from './constants';
import { hexToRgba, getEventAlpha, relTime } from './helpers';

interface RenderFocusedParams {
  ctx: CanvasRenderingContext2D;
  group: Group;
  width: number;
  height: number;
  transform: { x: number; y: number; k: number };
  dpr: number;
}

export function renderFocused({ ctx, group, width, height, transform, dpr }: RenderFocusedParams): void {
  const k = transform.k;
  const yTop = height * 0.06;
  const yBottom = height * 0.08;
  const laneHeight = (height - yTop - yBottom) / LANE_TYPES.length;
  const xPad = width * 0.10;
  const xRange = width - xPad * 2;

  // Lane backgrounds with type-colored gradients
  for (let i = 0; i < LANE_TYPES.length; i++) {
    const laneY = yTop + i * laneHeight;
    const laneColor = COLORS[LANE_TYPES[i]];

    const laneGrad = ctx.createLinearGradient(0, laneY, 0, laneY + laneHeight);
    laneGrad.addColorStop(0, hexToRgba(laneColor, 0.03));
    laneGrad.addColorStop(0.5, hexToRgba(laneColor, 0.06));
    laneGrad.addColorStop(1, hexToRgba(laneColor, 0.02));
    ctx.fillStyle = laneGrad;
    ctx.fillRect(0, laneY, width, laneHeight);

    ctx.strokeStyle = hexToRgba(laneColor, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, laneY);
    ctx.lineTo(width, laneY);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(laneColor, 0.08);
    ctx.font = `bold ${Math.min(laneHeight * 0.35, 48)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[LANE_TYPES[i]].toUpperCase(), width / 2, laneY + laneHeight / 2);

    ctx.fillStyle = hexToRgba(laneColor, 0.6);
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(LABELS[LANE_TYPES[i]], 10, laneY + 6);
  }

  // Bottom lane separator
  ctx.strokeStyle = 'rgba(63,63,70,0.3)';
  ctx.beginPath();
  ctx.moveTo(0, yTop + LANE_TYPES.length * laneHeight);
  ctx.lineTo(width, yTop + LANE_TYPES.length * laneHeight);
  ctx.stroke();

  // Time axis
  renderTimeAxis(ctx, group, width, height, yTop, yBottom, xPad, xRange, laneHeight, transform);

  // Connection lines
  const sorted = [...group.events].sort((a, b) => a.timestamp - b.timestamp);
  ctx.strokeStyle = hexToRgba(group.dominantColor, 0.08);
  ctx.lineWidth = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.type === curr.type) {
      const px = prev.x * k + transform.x;
      const cx2 = curr.x * k + transform.x;
      ctx.beginPath();
      ctx.moveTo(px, prev.y);
      ctx.lineTo(cx2, curr.y);
      ctx.stroke();
    }
  }

  // Events
  renderFocusedEvents(ctx, group, width, transform);

  // Frosted header
  const headerGrad = ctx.createLinearGradient(0, 0, 0, 48);
  headerGrad.addColorStop(0, 'rgba(10,10,12,0.9)');
  headerGrad.addColorStop(1, 'rgba(10,10,12,0)');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 48);

  ctx.fillStyle = group.dominantColor;
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(group.name, width / 2, 12);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText(`${group.events.length} events  ·  Timeline  ·  Scroll to navigate`, width / 2, 32);

  // Vignette edges
  const vigLeft = ctx.createLinearGradient(0, 0, 60, 0);
  vigLeft.addColorStop(0, 'rgba(10,10,12,0.7)');
  vigLeft.addColorStop(1, 'rgba(10,10,12,0)');
  ctx.fillStyle = vigLeft;
  ctx.fillRect(0, yTop, 60, LANE_TYPES.length * laneHeight);

  const vigRight = ctx.createLinearGradient(width - 60, 0, width, 0);
  vigRight.addColorStop(0, 'rgba(10,10,12,0)');
  vigRight.addColorStop(1, 'rgba(10,10,12,0.7)');
  ctx.fillStyle = vigRight;
  ctx.fillRect(width - 60, yTop, 60, LANE_TYPES.length * laneHeight);
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

  ctx.font = '9px Inter, system-ui, sans-serif';
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
      ctx.font = '8px Inter, system-ui, sans-serif';
      ctx.fillText(`W${weekNum}`, screenGridX, axisY + 20);
      ctx.font = '9px Inter, system-ui, sans-serif';
    }
    weekStart += WEEK_MS;
  }
}

function renderFocusedEvents(
  ctx: CanvasRenderingContext2D, group: Group,
  width: number, transform: { x: number; y: number; k: number }
): void {
  const k = transform.k;
  const now = Date.now();

  for (const evt of group.events) {
    const alpha = getEventAlpha(evt.timestamp);
    const evtColor = COLORS[evt.type];
    const screenX = evt.x * k + transform.x;
    const screenY = evt.y;

    if (screenX < -80 || screenX > width + 80) continue;

    if (k < 1.5) {
      const dotRadius = (4 + evt.weight * 4) * Math.min(k, 1.3);
      const isRecent = (now - evt.timestamp) < 86400000;

      if (isRecent || evt.weight > 1.5) {
        ctx.save();
        ctx.shadowBlur = 10 + evt.weight * 5;
        ctx.shadowColor = hexToRgba(evtColor, 0.5);
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(evtColor, 0.9);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(evtColor, alpha);
        ctx.fill();
      }

      if (k > 0.6) {
        ctx.fillStyle = 'rgba(228,228,231,0.8)';
        ctx.font = `500 ${Math.max(9, Math.round(11 * Math.min(k, 1.2)))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = evt.summary.length > 20 ? evt.summary.slice(0, 19) + '..' : evt.summary;
        ctx.fillText(label, screenX, screenY + dotRadius + 5);
      }
    } else {
      const cardScale = Math.min(k * 0.7, 1.4);
      const cardW = 180 * cardScale;
      const cardH = 64 * cardScale;
      const cx = screenX - cardW / 2;
      const cy = screenY - cardH / 2;

      ctx.fillStyle = 'rgba(24,24,27,0.92)';
      ctx.strokeStyle = hexToRgba(evtColor, alpha * 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6 * cardScale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = evtColor;
      ctx.fillRect(cx + 5 * cardScale, cy + 7 * cardScale, 3 * cardScale, cardH - 14 * cardScale);

      ctx.fillStyle = '#f4f4f5';
      ctx.font = `600 ${Math.round(13 * cardScale)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const summaryText = evt.summary.length > 28 ? evt.summary.slice(0, 27) + '..' : evt.summary;
      ctx.fillText(summaryText, cx + 14 * cardScale, cy + 9 * cardScale);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = `${Math.round(10 * cardScale)}px Inter, system-ui, sans-serif`;
      ctx.fillText(`${LABELS[evt.type]}  ·  ${relTime(evt.timestamp)}`, cx + 14 * cardScale, cy + 28 * cardScale);

      const barY = cy + cardH - 11 * cardScale;
      ctx.fillStyle = 'rgba(63,63,70,0.5)';
      ctx.fillRect(cx + 14 * cardScale, barY, 80 * cardScale, 3 * cardScale);
      ctx.fillStyle = evtColor;
      ctx.fillRect(cx + 14 * cardScale, barY, (evt.weight / 2) * 80 * cardScale, 3 * cardScale);
    }
  }
}

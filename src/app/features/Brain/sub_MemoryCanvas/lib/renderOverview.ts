import type { Group } from './types';
import { COLORS, FOCUS_ZOOM_THRESHOLD } from './constants';
import { hexToRgba, getEventAlpha } from './helpers';

interface RenderOverviewParams {
  ctx: CanvasRenderingContext2D;
  groups: Group[];
  width: number;
  height: number;
  transform: { x: number; y: number; k: number };
  dpr: number;
  selectedGroupId: string | null;
}

export function renderOverview({ ctx, groups, width, height, transform, dpr, selectedGroupId }: RenderOverviewParams): void {
  const k = transform.k;

  ctx.save();
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * transform.x, dpr * transform.y);

  // Constellation lines between nearby groups
  if (groups.length > 1 && k > 0.5) {
    ctx.lineWidth = 0.5 / k;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i], b = groups[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = (a.radius + b.radius) * 3;
        if (dist < maxDist) {
          const lineAlpha = 0.12 * (1 - dist / maxDist);
          ctx.strokeStyle = `rgba(168,162,200,${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  for (const group of groups) {
    renderGroupBubble(ctx, group, k, group.id === selectedGroupId);
  }

  ctx.restore();

  // Focus hint near threshold
  if (k >= 1.2 && k < FOCUS_ZOOM_THRESHOLD) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hintText = 'Zoom in to focus · ←→ Navigate · Enter to select';
    ctx.font = '10px Inter, system-ui, sans-serif';
    const hintWidth = ctx.measureText(hintText).width + 24;
    const hintX = (width - hintWidth) / 2;
    const hintY = height - 54;
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
    ctx.fillText(hintText, width / 2, hintY + 12);
  }

  // Vignette edges
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vig1 = ctx.createLinearGradient(0, 0, 0, 50);
  vig1.addColorStop(0, 'rgba(10,10,12,0.5)');
  vig1.addColorStop(1, 'rgba(10,10,12,0)');
  ctx.fillStyle = vig1;
  ctx.fillRect(0, 0, width, 50);

  const vig2 = ctx.createLinearGradient(0, height - 50, 0, height);
  vig2.addColorStop(0, 'rgba(10,10,12,0)');
  vig2.addColorStop(1, 'rgba(10,10,12,0.5)');
  ctx.fillStyle = vig2;
  ctx.fillRect(0, height - 50, width, 50);
}

function renderGroupBubble(ctx: CanvasRenderingContext2D, group: Group, k: number, isSelected: boolean): void {
  const color = group.dominantColor;
  const { x: gx, y: gy, radius } = group;

  // Ambient glow halo
  if (k > 0.5) {
    const haloGrad = ctx.createRadialGradient(gx, gy, radius * 0.5, gx, gy, radius * 1.6);
    haloGrad.addColorStop(0, hexToRgba(color, isSelected ? 0.12 : 0.04));
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial gradient bubble fill
  const bubbleGrad = ctx.createRadialGradient(gx - radius * 0.3, gy - radius * 0.3, 0, gx, gy, radius);
  bubbleGrad.addColorStop(0, hexToRgba(color, isSelected ? 0.18 : 0.1));
  bubbleGrad.addColorStop(0.6, hexToRgba(color, isSelected ? 0.08 : 0.04));
  bubbleGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(gx, gy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bubbleGrad;
  ctx.fill();

  // Bubble border
  if (isSelected) {
    ctx.save();
    ctx.shadowBlur = 24 / k;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(gx, gy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 / k;
    ctx.stroke();
    ctx.shadowBlur = 12 / k;
    ctx.strokeStyle = hexToRgba(color, 0.4);
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    ctx.arc(gx, gy, radius + 4 / k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(gx, gy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.2);
    ctx.lineWidth = 1 / k;
    ctx.stroke();
  }

  // Ultra zoomed out - condensed view
  if (k < 0.6) {
    const coreGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius * 0.6);
    coreGrad.addColorStop(0, hexToRgba(color, 0.6));
    coreGrad.addColorStop(1, hexToRgba(color, 0.15));
    ctx.beginPath();
    ctx.arc(gx, gy, radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.fillStyle = '#f4f4f5';
    ctx.font = `bold ${Math.max(10, 13 / k)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(group.name, gx, gy - radius - 6 / k);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${12 / k}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${group.events.length}`, gx, gy);
    return;
  }

  // Group label
  ctx.fillStyle = '#f4f4f5';
  ctx.font = `bold ${Math.min(14, 11 / k)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(group.name, gx, gy - radius - 4 / k);

  // Event count
  ctx.fillStyle = hexToRgba(color, 0.8);
  ctx.font = `${9 / k}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(`${group.events.length} events`, gx, gy + radius + 3 / k);

  // Event dots
  for (const evt of group.events) {
    const alpha = getEventAlpha(evt.timestamp);
    const evtColor = COLORS[evt.type];
    const dotRadius = (2.5 + evt.weight * 2.5) / Math.max(0.7, k * 0.5);

    if ((evt.weight > 1.0 && alpha > 0.5) || alpha > 0.8) {
      ctx.save();
      ctx.shadowBlur = (8 + evt.weight * 4) / k;
      ctx.shadowColor = hexToRgba(evtColor, 0.5 * alpha);
      ctx.beginPath();
      ctx.arc(evt.x, evt.y, dotRadius * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(evtColor, 0.15 * alpha);
      ctx.fill();
      ctx.restore();
    }

    const dotGrad = ctx.createRadialGradient(evt.x, evt.y, 0, evt.x, evt.y, dotRadius);
    dotGrad.addColorStop(0, hexToRgba(evtColor, Math.min(1, alpha + 0.3)));
    dotGrad.addColorStop(1, hexToRgba(evtColor, alpha * 0.6));
    ctx.beginPath();
    ctx.arc(evt.x, evt.y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = dotGrad;
    ctx.fill();

    if (evt.weight > 1.5) {
      ctx.beginPath();
      ctx.arc(evt.x, evt.y, dotRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.5 * alpha})`;
      ctx.fill();
    }
  }
}

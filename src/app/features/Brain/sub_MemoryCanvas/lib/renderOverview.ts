import type { Group, FilterState } from './types';
import { FOCUS_ZOOM_THRESHOLD } from './constants';
import { colorAt } from './helpers';
import { executeRenderPipeline, type RenderContext } from './canvasRenderPipeline';
import { DISPLAY_FONT } from '../../lib/brainFonts';

interface RenderOverviewParams {
  ctx: CanvasRenderingContext2D;
  groups: Group[];
  width: number;
  height: number;
  transform: { x: number; y: number; k: number };
  dpr: number;
  selectedGroupId: string | null;
  filterState?: FilterState;
}

export function renderOverview({ ctx, groups, width, height, transform, dpr, selectedGroupId, filterState }: RenderOverviewParams): void {
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
    renderGroupBubble(ctx, group, k, group.id === selectedGroupId, filterState);
  }

  ctx.restore();

  // Build render context for overlay
  const renderContext: RenderContext = {
    ctx,
    width,
    height,
    dpr,
    transform,
    now: Date.now(),
    filterState,
  };

  // Execute overlay pipeline
  executeRenderPipeline(renderContext, {
    overlay: {
      hint: k >= 1.2 && k < FOCUS_ZOOM_THRESHOLD ? {
        text: 'Zoom in to focus · ←→ Navigate · Enter to select',
        yPosition: height - 54,
      } : undefined,
      vignette: {
        top: 50,
        bottom: 50,
      },
    },
  });
}

function renderGroupBubble(ctx: CanvasRenderingContext2D, group: Group, k: number, isSelected: boolean, filterState?: FilterState): void {
  const color = group.dominantColor;
  const { x: gx, y: gy, radius } = group;

  // Ambient glow halo — solid fill with globalAlpha instead of per-frame radial gradient
  if (k > 0.5) {
    ctx.save();
    ctx.globalAlpha = isSelected ? 0.08 : 0.03;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(gx, gy, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bubble fill — solid fill with globalAlpha instead of per-frame radial gradient
  ctx.save();
  ctx.globalAlpha = isSelected ? 0.12 : 0.06;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(gx, gy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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
    ctx.strokeStyle = colorAt(color, 0.4);
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    ctx.arc(gx, gy, radius + 4 / k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(gx, gy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = colorAt(color, 0.2);
    ctx.lineWidth = 1 / k;
    ctx.stroke();
  }

  // Ultra zoomed out - condensed view
  if (k < 0.6) {
    // Solid fill with globalAlpha instead of per-frame radial gradient
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(gx, gy, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f4f4f5';
    ctx.font = `bold ${Math.max(10, 13 / k)}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(group.name, gx, gy - radius - 6 / k);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${12 / k}px ${DISPLAY_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${group.events.length}`, gx, gy);
    return;
  }

  // Group label
  ctx.fillStyle = '#f4f4f5';
  ctx.font = `bold ${Math.min(14, 11 / k)}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(group.name, gx, gy - radius - 4 / k);

  // Event count
  ctx.fillStyle = colorAt(color, 0.8);
  ctx.font = `${9 / k}px ${DISPLAY_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillText(`${group.events.length} events`, gx, gy + radius + 3 / k);

  // Use pipeline for event dots and labels (world coordinate mode)
  // Note: We're already in world transform from parent renderOverview call
  // Create a pseudo-context that wraps the current state
  const dummyDpr = 1; // Already applied in parent
  const dummyWidth = 0; // Not used for world coords
  const dummyHeight = 0;
  const dummyTransform = { x: 0, y: 0, k: 1 }; // Identity since we're in world space

  const pseudoContext: RenderContext = {
    ctx,
    width: dummyWidth,
    height: dummyHeight,
    dpr: dummyDpr,
    transform: dummyTransform,
    now: Date.now(),
    filterState,
  };

  executeRenderPipeline(pseudoContext, {
    eventDots: {
      events: group.events,
      coordinateMode: 'world',
      dotScale: 1.0,
      enablePulse: true,
      enableGlow: true,
    },
    smartLabels: {
      events: group.events,
      coordinateMode: 'world',
      maxLabels: Math.min(5, Math.ceil(group.events.length * 0.4)),
    },
  });
}

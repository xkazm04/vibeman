import type { Group, FilterState, ConvergenceEvent } from './types';
import { FOCUS_ZOOM_THRESHOLD } from './constants';
import { colorAt, smoothFontSize, labelFadeAlpha } from './helpers';
import { executeRenderPipeline, type RenderContext } from './canvasRenderPipeline';
import { DISPLAY_FONT } from '../../lib/brainFonts';
import { renderMicroConstellations, renderConvergenceArcs } from './renderMicroConstellations';

interface RenderOverviewParams {
  ctx: CanvasRenderingContext2D;
  groups: Group[];
  width: number;
  height: number;
  transform: { x: number; y: number; k: number };
  dpr: number;
  selectedGroupId: string | null;
  filterState?: FilterState;
  convergenceEvents?: ConvergenceEvent[];
}

export function renderOverview({ ctx, groups, width, height, transform, dpr, selectedGroupId, filterState, convergenceEvents }: RenderOverviewParams): void {
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

  // Render convergence arcs between groups with shared semantic concepts
  if (convergenceEvents && convergenceEvents.length > 0) {
    renderConvergenceArcs(ctx, groups, convergenceEvents, k, Date.now());
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

    // Smooth fade for labels at low zoom
    const fade = labelFadeAlpha(k);
    if (fade > 0) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#f4f4f5';
      ctx.font = `bold ${Math.max(10, Math.round(smoothFontSize(1 / k, 13)))}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(group.name, gx, gy - radius - 6 / k);

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = fade;
      ctx.font = `bold ${Math.round(smoothFontSize(1 / k, 12))}px ${DISPLAY_FONT}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`${group.events.length}`, gx, gy);
      ctx.restore();
    }
    return;
  }

  // Group label — smooth eased font size
  ctx.fillStyle = '#f4f4f5';
  ctx.font = `bold ${Math.min(14, Math.round(smoothFontSize(1 / k, 11)))}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(group.name, gx, gy - radius - 4 / k);

  // Event count — smooth eased font size
  ctx.fillStyle = colorAt(color, 0.8);
  ctx.font = `${Math.round(smoothFontSize(1 / k, 9))}px ${DISPLAY_FONT}`;
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

  // Render semantic sub-cluster micro-constellations
  if (group.semanticClusters && group.semanticClusters.length > 0) {
    renderMicroConstellations(ctx, {
      group,
      k,
      now: Date.now(),
      filterState,
    });
  }
}

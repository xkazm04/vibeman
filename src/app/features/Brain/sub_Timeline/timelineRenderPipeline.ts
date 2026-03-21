/**
 * Timeline-specific render pipeline extensions
 *
 * Extends the shared canvas render pipeline with timeline-specific passes
 * (lane backgrounds, time axis) while reusing common event/label rendering.
 */

import { executeRenderPipeline, withWorldTransform, type RenderContext, type RenderPassFn, type RenderPipelineConfig } from '../sub_MemoryCanvas/lib/canvasRenderPipeline';
import { hexToRgba } from '../sub_MemoryCanvas/lib/helpers';
import { COLORS } from '../sub_MemoryCanvas/lib/constants';
import type { SignalType } from '../sub_MemoryCanvas/lib/types';
import { DISPLAY_FONT, FONT_SIZE } from '../lib/brainFonts';

// ─── Timeline Margins ─────────────────────────────────────────────────────

export const TIMELINE_MARGIN = { top: 50, right: 30, bottom: 30, left: 130 };

// ─── Lane Background Pass ─────────────────────────────────────────────────

export interface LaneBackgroundConfig {
  laneTypes: SignalType[];
  laneLabels: Record<SignalType, string>;
  visibleTypes: Set<SignalType>;
  margin: typeof TIMELINE_MARGIN;
}

export const renderLaneBackground: RenderPassFn<LaneBackgroundConfig> = (
  { ctx, width, height, dpr },
  config
) => {
  const { laneTypes, laneLabels, visibleTypes, margin } = config;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const plotH = height - margin.top - margin.bottom;
  const laneH = plotH / laneTypes.length;

  ctx.font = 'bold 11px ${DISPLAY_FONT}';

  laneTypes.forEach((type, i) => {
    const y = margin.top + i * laneH + laneH / 2;
    const typeVisible = visibleTypes.has(type);
    const labelAlpha = typeVisible ? 1.0 : 0.25;

    // Color indicator bar
    ctx.fillStyle = hexToRgba(COLORS[type], labelAlpha);
    ctx.fillRect(8, y - 6, 8, 12);

    // Lane label
    ctx.fillStyle = hexToRgba('#d4d4d8', labelAlpha);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(laneLabels[type], 24, y);
  });
};

// ─── Time Axis Pass ───────────────────────────────────────────────────────

export interface TimeAxisConfig {
  margin: typeof TIMELINE_MARGIN;
  dayCount?: number;
}

export const renderTimeAxis: RenderPassFn<TimeAxisConfig> = (
  { ctx, width, height, dpr, now },
  config
) => {
  const { margin, dayCount = 7 } = config;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const plotW = width - margin.left - margin.right;

  ctx.font = '10px ${DISPLAY_FONT}';
  ctx.fillStyle = '#71717a';
  ctx.textAlign = 'center';

  for (let d = 0; d <= dayCount; d++) {
    const x = margin.left + (d / dayCount) * plotW;
    const date = new Date(now - (dayCount - d) * 86400000);
    ctx.fillText(
      date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      x,
      margin.top - 12
    );
  }
};

// ─── Timeline Grid Pass ───────────────────────────────────────────────────

export interface TimelineGridConfig {
  laneCount: number;
  dayCount?: number;
  margin: typeof TIMELINE_MARGIN;
  gridColor?: string;
}

export const renderTimelineGrid: RenderPassFn<TimelineGridConfig> = (
  { ctx, width, height, transform, dpr },
  config
) => {
  const { laneCount, dayCount = 7, margin, gridColor = '#27272a' } = config;

  const k = transform.k;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const laneH = plotH / laneCount;

  withWorldTransform(ctx, dpr, transform, () => {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / k;

    // Horizontal lane dividers
    for (let i = 0; i <= laneCount; i++) {
      const y = margin.top + i * laneH;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
      ctx.stroke();
    }

    // Vertical day dividers
    for (let d = 0; d <= dayCount; d++) {
      const x = margin.left + (d / dayCount) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();
    }
  });
};

// ─── Empty State Pass ─────────────────────────────────────────────────────

export interface EmptyStateConfig {
  laneTypes: SignalType[];
  laneLabels: Record<SignalType, string>;
  margin: typeof TIMELINE_MARGIN;
  message?: {
    title: string;
    lines: string[];
  };
}

export const renderEmptyState: RenderPassFn<EmptyStateConfig> = (
  { ctx, width, height, dpr },
  config
) => {
  const {
    laneTypes,
    laneLabels,
    margin,
    message = {
      title: 'No timeline data',
      lines: [
        'Brain collects data from task executions,',
        'idea reviews, and direction decisions.',
      ],
    },
  } = config;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const laneH = plotH / laneTypes.length;

  // Ghost lane labels
  ctx.font = 'bold 11px ${DISPLAY_FONT}';
  laneTypes.forEach((type, i) => {
    const y = margin.top + i * laneH + laneH / 2;
    ctx.fillStyle = hexToRgba(COLORS[type], 0.10);
    ctx.fillRect(8, y - 6, 8, 12);
    ctx.fillStyle = hexToRgba('#d4d4d8', 0.10);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(laneLabels[type], 24, y);

    // Dotted center line
    ctx.strokeStyle = hexToRgba('#71717a', 0.04);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Central empty message
  const cx = width / 2;
  const cy = height / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(161,161,170,0.6)';
  ctx.font = '500 14px ${DISPLAY_FONT}';
  ctx.fillText(message.title, cx, cy - 10);

  ctx.fillStyle = 'rgba(113,113,122,0.5)';
  ctx.font = '12px ${DISPLAY_FONT}';
  message.lines.forEach((line, i) => {
    ctx.fillText(line, cx, cy + 12 + i * 16);
  });
};

// ─── Timeline Render Pipeline ─────────────────────────────────────────────

export type TimelineRenderPipelineConfig = RenderPipelineConfig & {
  laneBackground?: LaneBackgroundConfig;
  timeAxis?: TimeAxisConfig;
  timelineGrid?: TimelineGridConfig;
  emptyState?: EmptyStateConfig;
};

export function executeTimelineRenderPipeline(
  context: RenderContext,
  config: TimelineRenderPipelineConfig
): void {
  // Timeline-specific passes first
  if (config.emptyState) {
    renderEmptyState(context, config.emptyState);
    return; // Early exit for empty state
  }

  if (config.laneBackground) {
    renderLaneBackground(context, config.laneBackground);
  }

  if (config.timeAxis) {
    renderTimeAxis(context, config.timeAxis);
  }

  if (config.timelineGrid) {
    renderTimelineGrid(context, config.timelineGrid);
  }

  // Delegate to shared pipeline for event rendering
  const { laneBackground, timeAxis, timelineGrid, emptyState, ...sharedPasses } = config;
  executeRenderPipeline(context, sharedPasses);
}

'use client';

import React, { useId } from 'react';

interface ConfidencePoint {
  confidence: number; // 1-5
  weekOf: string;
}

interface ConfidenceSparklineProps {
  history: ConfidencePoint[];
  width?: number;
  height?: number;
}

function getTrendColor(history: ConfidencePoint[]): string {
  if (history.length < 2) return '#94a3b8'; // slate-400
  const first = history[0].confidence;
  const last = history[history.length - 1].confidence;
  const diff = last - first;
  if (diff > 0) return '#22c55e'; // green-500
  if (diff < 0) return '#f59e0b'; // amber-500
  return '#94a3b8'; // slate-400
}

/**
 * Tiny inline sparkline showing confidence trend (1-5) over weeks.
 * Rendered on goal list items.
 */
export default function ConfidenceSparkline({ history, width = 40, height = 16 }: ConfidenceSparklineProps) {
  const gradientId = useId();

  if (history.length === 0) return null;

  // Single point — show a dot
  if (history.length === 1) {
    const color = getTrendColor(history);
    return (
      <svg width={width} height={height} className="inline-block" aria-label={`Confidence: ${history[0].confidence}/5`}>
        <title>{`Confidence: ${history[0].confidence}/5`}</title>
        <circle cx={width / 2} cy={height / 2} r={2} fill={color} />
      </svg>
    );
  }

  const color = getTrendColor(history);
  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const chartBottom = padding + chartH;

  // Scale confidence (1-5) to chart coordinates
  const points = history.map((p, idx) => ({
    x: padding + (idx / (history.length - 1)) * chartW,
    y: padding + chartH - ((p.confidence - 1) / 4) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD
    + ` L ${points[points.length - 1].x.toFixed(1)} ${chartBottom.toFixed(1)}`
    + ` L ${points[0].x.toFixed(1)} ${chartBottom.toFixed(1)} Z`;

  const safeId = `confSpk${gradientId.replace(/:/g, '')}`;

  return (
    <svg
      width={width}
      height={height}
      className="inline-block"
      aria-label={`Confidence trend: ${history[history.length - 1].confidence}/5`}
    >
      <title>{`Confidence trend: ${history[history.length - 1].confidence}/5`}</title>
      <defs>
        <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${safeId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

'use client';

import { useState } from 'react';
import type { ConfidencePoint } from '@/app/api/brain/insights/route';

interface Props {
  history: ConfidencePoint[];
  width?: number;
  height?: number;
}

type Trend = 'growing' | 'stable' | 'declining';

function getTrend(history: ConfidencePoint[]): Trend {
  if (history.length < 2) return 'stable';
  const first = history[0].confidence;
  const last = history[history.length - 1].confidence;
  const diff = last - first;
  if (diff > 5) return 'growing';
  if (diff < -5) return 'declining';
  return 'stable';
}

const trendColors: Record<Trend, string> = {
  growing: '#4ade80',   // green-400
  stable: '#a1a1aa',    // zinc-400
  declining: '#fbbf24', // amber-400
};

/**
 * Tiny inline SVG sparkline showing confidence over time.
 * Color indicates trend: green (growing), gray (stable), amber (declining).
 * Hover shows tooltip with point details.
 */
export default function InsightSparkline({ history, width = 48, height = 18 }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (history.length === 0) return null;

  // Single point — just show a dot
  if (history.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        className="inline-block"
        title={`${history[0].confidence}%`}
      >
        <circle
          cx={width / 2}
          cy={height / 2}
          r={2.5}
          fill={trendColors.stable}
        />
      </svg>
    );
  }

  const trend = getTrend(history);
  const color = trendColors[trend];

  // Compute SVG path
  const padding = 3;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Scale confidence (0-100) to chart coordinates
  const minConf = Math.min(...history.map(p => p.confidence));
  const maxConf = Math.max(...history.map(p => p.confidence));
  const confRange = maxConf - minConf || 1; // Avoid division by zero

  const points = history.map((point, idx) => {
    const x = padding + (idx / (history.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.confidence - minConf) / confRange) * chartHeight;
    return { x, y, ...point };
  });

  // Build SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Format date for tooltip
  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative inline-block" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        className="block"
      >
        {/* Sparkline path */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data point dots */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === idx ? 3 : 1.5}
            fill={color}
            className="transition-all"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>
      {/* Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute z-50 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-200 whitespace-nowrap pointer-events-none shadow-lg"
          style={{
            bottom: height + 4,
            left: Math.min(Math.max(points[hoveredIdx].x - 20, 0), width - 40),
          }}
        >
          {points[hoveredIdx].confidence}% — {formatTooltipDate(points[hoveredIdx].date)}
        </div>
      )}
    </div>
  );
}

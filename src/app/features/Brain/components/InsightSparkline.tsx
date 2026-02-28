'use client';

import { useState, useId } from 'react';
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
 * Features gradient fill under the line and a draw-in entrance animation.
 */
export default function InsightSparkline({ history, width = 48, height = 18 }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradientId = useId();

  if (history.length === 0) return null;

  // Single point -- just show a dot
  if (history.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        className="inline-block"
        aria-label={`${history[0].confidence}%`}
      >
        <title>{`${history[0].confidence}%`}</title>
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
  const chartBottom = padding + chartHeight;

  // Scale confidence (0-100) to chart coordinates
  const minConf = Math.min(...history.map(p => p.confidence));
  const maxConf = Math.max(...history.map(p => p.confidence));
  const confRange = maxConf - minConf || 1; // Avoid division by zero

  const points = history.map((point, idx) => {
    const x = padding + (idx / (history.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.confidence - minConf) / confRange) * chartHeight;
    return { x, y, ...point };
  });

  // Build SVG line path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Build closed area path for gradient fill (line path + close to bottom)
  const areaD = pathD
    + ` L ${points[points.length - 1].x.toFixed(1)} ${chartBottom.toFixed(1)}`
    + ` L ${points[0].x.toFixed(1)} ${chartBottom.toFixed(1)} Z`;

  // Approximate total path length for draw-in animation
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  const dashLength = Math.ceil(totalLength + 2);

  // Format date for tooltip
  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Use a CSS-safe gradient ID (strip colons from useId)
  const safeGradientId = `sparkGrad${gradientId.replace(/:/g, '')}`;

  return (
    <div className="relative inline-block" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        className="block"
      >
        {/* Animation keyframes + gradient definition */}
        <defs>
          <linearGradient id={safeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes sparkline-draw-${safeGradientId} {
            from { stroke-dashoffset: ${dashLength}; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes sparkline-fill-${safeGradientId} {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        {/* Gradient-filled area under the line */}
        <path
          d={areaD}
          fill={`url(#${safeGradientId})`}
          style={{
            animation: `sparkline-fill-${safeGradientId} 0.8s ease-out forwards`,
            opacity: 0,
          }}
        />
        {/* Sparkline path with draw-in animation */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashLength}
          style={{
            animation: `sparkline-draw-${safeGradientId} 0.6s ease-out forwards`,
          }}
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
          {points[hoveredIdx].confidence}% -- {formatTooltipDate(points[hoveredIdx].date)}
        </div>
      )}
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { HealthHistoryPoint } from '@/app/db/models/project-health.types';
import { getScoreColor, formatHealthDate } from '../lib/healthHelpers';

interface HealthTrendChartProps {
  data: HealthHistoryPoint[];
  height?: number;
}

export default function HealthTrendChart({ data, height = 200 }: HealthTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height }}
        data-testid="health-trend-chart-empty"
      >
        No historical data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = 600;
  const chartHeight = height;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const scores = data.map((d) => d.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 100);
  const scoreRange = maxScore - minScore || 1;

  // Generate path
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * plotWidth;
    const y = padding.top + plotHeight - ((d.score - minScore) / scoreRange) * plotHeight;
    return { x, y, score: d.score, date: d.date };
  });

  // Create smooth path using quadratic curves
  const pathD = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;

    const prev = points[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${path} Q ${cpX} ${prev.y} ${point.x} ${point.y}`;
  }, '');

  // Create area fill path
  const areaPath = `${pathD} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`;

  // Generate grid lines
  const gridLines = [0, 25, 50, 75, 100].map((score) => ({
    y: padding.top + plotHeight - ((score - minScore) / scoreRange) * plotHeight,
    label: score,
  }));

  return (
    <div className="relative" data-testid="health-trend-chart">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="healthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={chartWidth - padding.right}
              y2={line.y}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={line.y + 4}
              textAnchor="end"
              className="fill-gray-500 text-xs"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#healthGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#healthGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        {/* Data points */}
        {points.map((point, i) => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={getScoreColor(point.score)}
              className="cursor-pointer hover:r-8 transition-all"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill="white"
            />

            {/* X-axis labels (show every other for readability) */}
            {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 5) === 0) && (
              <text
                x={point.x}
                y={chartHeight - 10}
                textAnchor="middle"
                className="fill-gray-500 text-xs"
              >
                {formatHealthDate(point.date)}
              </text>
            )}
          </motion.g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-400">85+ Excellent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-xs text-gray-400">70-84 Good</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-400">50-69 Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-400">&lt;50 Poor</span>
        </div>
      </div>
    </div>
  );
}

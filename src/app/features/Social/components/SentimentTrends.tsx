'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import type { Sentiment } from '../lib/types/feedbackTypes';

interface SentimentDataPoint {
  date: string; // ISO date
  sentiment: Sentiment;
  score: number; // -1 to 1
  count: number;
}

interface SentimentTrendsProps {
  data: SentimentDataPoint[];
  height?: number;
  showLegend?: boolean;
  showStats?: boolean;
  timeRange?: '7d' | '14d' | '30d' | 'all';
  onTimeRangeChange?: (range: '7d' | '14d' | '30d' | 'all') => void;
}

// Sentiment to color mapping
const SENTIMENT_COLORS: Record<string, string> = {
  angry: '#ef4444',
  frustrated: '#f97316',
  disappointed: '#f59e0b',
  neutral: '#6b7280',
  constructive: '#3b82f6',
  helpful: '#22c55e',
  mocking: '#a855f7',
};

export default function SentimentTrends({
  data,
  height = 200,
  showLegend = true,
  showStats = true,
  timeRange = '7d',
  onTimeRangeChange,
}: SentimentTrendsProps) {
  // Filter data by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data;

    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return data.filter(d => new Date(d.date) >= cutoff);
  }, [data, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { avg: 0, trend: 'stable' as const, change: 0, negativeRatio: 0 };
    }

    const scores = filteredData.map(d => d.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midpoint);
    const secondHalf = scores.slice(midpoint);

    const firstAvg = firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : 0;

    const change = secondAvg - firstAvg;
    const trend = change > 0.1 ? 'up' as const : change < -0.1 ? 'down' as const : 'stable' as const;

    // Negative ratio
    const negativeCount = filteredData.filter(
      d => ['angry', 'frustrated', 'disappointed'].includes(d.sentiment)
    ).length;
    const negativeRatio = filteredData.length > 0 ? negativeCount / filteredData.length : 0;

    return { avg, trend, change, negativeRatio };
  }, [filteredData]);

  // Group data by date for chart
  const chartData = useMemo(() => {
    const grouped = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();

    for (const point of filteredData) {
      const date = point.date.split('T')[0];
      const existing = grouped.get(date) || { positive: 0, negative: 0, neutral: 0, total: 0 };

      if (point.score > 0.1) existing.positive += point.count;
      else if (point.score < -0.1) existing.negative += point.count;
      else existing.neutral += point.count;
      existing.total += point.count;

      grouped.set(date, existing);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date,
        ...values,
        positiveRatio: values.total > 0 ? values.positive / values.total : 0,
        negativeRatio: values.total > 0 ? values.negative / values.total : 0,
      }));
  }, [filteredData]);

  // Calculate chart dimensions
  const chartWidth = 100; // percentage
  const barWidth = chartData.length > 0 ? Math.max(8, Math.min(40, chartWidth / chartData.length - 4)) : 20;
  const maxTotal = Math.max(...chartData.map(d => d.total), 1);

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats.trend === 'up' ? 'text-green-400' : stats.trend === 'down' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-200">Sentiment Trends</span>
        </div>

        {/* Time range selector */}
        {onTimeRangeChange && (
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-0.5">
            {(['7d', '14d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats summary */}
      {showStats && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Average sentiment */}
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 mb-1">Avg Sentiment</div>
            <div className={`text-lg font-bold ${stats.avg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.avg >= 0 ? '+' : ''}{(stats.avg * 100).toFixed(0)}%
            </div>
          </div>

          {/* Trend */}
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 mb-1">Trend</div>
            <div className={`flex items-center gap-1 text-lg font-bold ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="capitalize">{stats.trend}</span>
            </div>
          </div>

          {/* Change */}
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 mb-1">Change</div>
            <div className={`text-lg font-bold ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.change >= 0 ? '+' : ''}{(stats.change * 100).toFixed(0)}%
            </div>
          </div>

          {/* Negative ratio */}
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 mb-1">Negative Rate</div>
            <div className={`text-lg font-bold ${stats.negativeRatio > 0.3 ? 'text-red-400' : 'text-gray-300'}`}>
              {(stats.negativeRatio * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative" style={{ height }}>
        {chartData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            No data for selected period
          </div>
        ) : (
          <>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-gray-500">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-10 right-0 top-0 bottom-6 flex items-end justify-between gap-1">
              {chartData.map((point, i) => (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center group"
                  style={{ maxWidth: barWidth }}
                >
                  {/* Stacked bar */}
                  <div
                    className="w-full bg-gray-800 rounded-t relative overflow-hidden"
                    style={{ height: `${(point.total / maxTotal) * 100}%`, minHeight: 4 }}
                  >
                    {/* Negative (bottom) */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 bg-red-500/80"
                      initial={{ height: 0 }}
                      animate={{ height: `${point.negativeRatio * 100}%` }}
                      transition={{ delay: i * 0.02 }}
                    />
                    {/* Neutral (middle) - fills remaining */}
                    <motion.div
                      className="absolute left-0 right-0 bg-gray-600/80"
                      initial={{ height: 0, bottom: 0 }}
                      animate={{
                        height: `${(1 - point.positiveRatio - point.negativeRatio) * 100}%`,
                        bottom: `${point.negativeRatio * 100}%`,
                      }}
                      transition={{ delay: i * 0.02 }}
                    />
                    {/* Positive (top) */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 bg-green-500/80"
                      initial={{ height: 0 }}
                      animate={{ height: `${point.positiveRatio * 100}%` }}
                      transition={{ delay: i * 0.02 }}
                    />
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-[10px] whitespace-nowrap shadow-lg">
                      <div className="font-medium text-gray-200 mb-1">
                        {new Date(point.date).toLocaleDateString()}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-green-400">+{point.positive} positive</span>
                        <span className="text-gray-400">{point.neutral} neutral</span>
                        <span className="text-red-400">-{point.negative} negative</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* X-axis labels */}
            <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between text-[10px] text-gray-500">
              {chartData.length > 0 && (
                <>
                  <span>{new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {chartData.length > 2 && (
                    <span>
                      {new Date(chartData[Math.floor(chartData.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span>
                    {new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500/80" />
            <span className="text-[10px] text-gray-400">Positive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-600/80" />
            <span className="text-[10px] text-gray-400">Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/80" />
            <span className="text-[10px] text-gray-400">Negative</span>
          </div>
        </div>
      )}

      {/* Alert for high negative rate */}
      {stats.negativeRatio > 0.4 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">
            High negative sentiment rate ({(stats.negativeRatio * 100).toFixed(0)}%) - consider investigating
          </span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Compact sparkline version of sentiment trends
 */
interface SentimentSparklineProps {
  scores: number[]; // Array of scores from -1 to 1
  width?: number;
  height?: number;
}

export function SentimentSparkline({ scores, width = 60, height = 20 }: SentimentSparklineProps) {
  if (scores.length < 2) return null;

  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = ((1 - (score + 1) / 2)) * height; // Convert -1..1 to height..0
    return `${x},${y}`;
  }).join(' ');

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const strokeColor = avgScore >= 0.1 ? '#22c55e' : avgScore <= -0.1 ? '#ef4444' : '#6b7280';

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Center line (neutral) */}
      <line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="#374151"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      {/* Trend line */}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={width}
        cy={((1 - (scores[scores.length - 1] + 1) / 2)) * height}
        r={2}
        fill={strokeColor}
      />
    </svg>
  );
}

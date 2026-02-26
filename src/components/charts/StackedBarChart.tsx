'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Calendar, TrendingUp, LucideIcon } from 'lucide-react';

export interface StackedBarDataPoint {
  name: string;
  fullName?: string;
  [key: string]: string | number | undefined;
}

export interface StackConfig {
  key: string;
  label: string;
  gradient: { from: string; to: string };
  stroke: string;
}

export interface StackedBarChartProps {
  /** Chart title */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Icon for header */
  icon?: LucideIcon;
  /** Data points for the chart */
  data: StackedBarDataPoint[];
  /** Configuration for each stack */
  stacks: StackConfig[];
  /** Show total badge */
  showTotalBadge?: boolean;
  /** Show average badge */
  showAvgBadge?: boolean;
  /** Height of the chart */
  chartHeight?: number;
  /** Border color class */
  borderColor?: string;
}

// Custom tooltip with glass morphism
const CustomTooltip = ({ active, payload, stacks }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative bg-gray-950/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-4 py-3 shadow-2xl"
      style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
    >
      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/50 rounded-tl" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/50 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500/50 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/50 rounded-br" />

      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
        <p className="text-sm font-semibold text-white">{data?.fullName || data?.name}</p>
      </div>

      <div className="space-y-1.5">
        {stacks?.map((stack: StackConfig) => (
          <div key={stack.key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: `linear-gradient(to bottom, ${stack.gradient.from}, ${stack.gradient.to})` }}
              />
              <span className="text-xs text-gray-400">{stack.label}</span>
            </div>
            <span className="text-xs font-mono" style={{ color: stack.stroke }}>
              {data?.[stack.key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * StackedBarChart - A stacked bar chart with Recharts
 *
 * Features:
 * - Multiple stacked data series
 * - Gradient fills with glow effects
 * - Custom glass-morphism tooltip
 * - Total and average badges
 * - Grid pattern background
 */
export default function StackedBarChart({
  title,
  subtitle,
  icon: Icon = Calendar,
  data,
  stacks,
  showTotalBadge = true,
  showAvgBadge = true,
  chartHeight = 288,
  borderColor = 'border-cyan-500/20',
}: StackedBarChartProps) {
  // Calculate totals
  const totalValue = data.reduce((sum, d) => {
    return sum + stacks.reduce((s, stack) => s + (Number(d[stack.key]) || 0), 0);
  }, 0);
  const avgPerItem = Math.round(totalValue / (data.length || 1));

  // Calculate max for Y axis
  const maxValue = Math.max(
    ...data.map(d => stacks.reduce((sum, stack) => sum + (Number(d[stack.key]) || 0), 0)),
    1
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border ${borderColor} rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.05)]`}
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-1/3 h-1/3 bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-1/4 h-1/4 bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-200">{title}</h3>
            {subtitle && <p className="text-xs font-mono text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-3">
          {showTotalBadge && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
              <span className="text-xs font-mono text-gray-500">TOTAL:</span>
              <span className="text-sm font-mono font-bold text-cyan-400">{totalValue}</span>
            </div>
          )}
          {showAvgBadge && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono text-gray-500">AVG:</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{avgPerItem}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10" style={{ height: chartHeight }}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} responsive width="100%" height="100%">
            <defs>
              {stacks.map((stack, idx) => (
                <linearGradient key={stack.key} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stack.gradient.from} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={stack.gradient.to} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.15}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(maxValue * 1.2)]}
            />
            <Tooltip
              content={<CustomTooltip stacks={stacks} />}
              cursor={{ fill: 'rgba(6, 182, 212, 0.03)' }}
            />
            {stacks.map((stack, idx) => (
              <Bar
                key={stack.key}
                dataKey={stack.key}
                stackId="a"
                fill={`url(#gradient-${idx})`}
                stroke={stack.stroke}
                strokeWidth={0.5}
                radius={idx === stacks.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
      </div>

      {/* Legend */}
      <div className="relative z-10 flex justify-center gap-6 mt-4 pt-3 border-t border-gray-800/30">
        {stacks.map((stack) => (
          <div key={stack.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                background: `linear-gradient(to bottom, ${stack.gradient.from}, ${stack.gradient.to})`,
                boxShadow: `0 0 6px ${stack.stroke}40`
              }}
            />
            <span className="text-xs font-mono text-gray-500">{stack.label.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

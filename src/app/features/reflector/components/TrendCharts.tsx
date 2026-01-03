'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DbIdea } from '@/app/db';
import { getScanTypeName, type ScanType } from '@/app/features/Ideas/lib/scanTypes';

interface TrendChartsProps {
  ideas: DbIdea[];
  dateRange?: { start: Date; end: Date };
  className?: string;
}

/**
 * TrendCharts - Visualizes trends in idea acceptance and scan effectiveness
 */
export default function TrendCharts({
  ideas,
  dateRange,
  className = '',
}: TrendChartsProps) {
  // Calculate weekly trends
  const weeklyTrends = useMemo(() => {
    const weekMap = new Map<string, { total: number; accepted: number; rejected: number }>();

    ideas.forEach(idea => {
      const date = new Date(idea.created_at);
      // Get week start (Monday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = weekStart.toISOString().split('T')[0];

      const current = weekMap.get(weekKey) || { total: 0, accepted: 0, rejected: 0 };
      current.total++;
      if (idea.status === 'accepted') current.accepted++;
      if (idea.status === 'rejected') current.rejected++;
      weekMap.set(weekKey, current);
    });

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8) // Last 8 weeks
      .map(([week, data]) => ({
        week: formatWeekLabel(week),
        total: data.total,
        accepted: data.accepted,
        rejected: data.rejected,
        acceptanceRate: data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0,
      }));
  }, [ideas]);

  // Calculate scan type effectiveness
  const scanTypeEffectiveness = useMemo(() => {
    const scanMap = new Map<string, { total: number; accepted: number }>();

    ideas.forEach(idea => {
      if (!idea.scan_type) return;
      const current = scanMap.get(idea.scan_type) || { total: 0, accepted: 0 };
      current.total++;
      if (idea.status === 'accepted') current.accepted++;
      scanMap.set(idea.scan_type, current);
    });

    return Array.from(scanMap.entries())
      .map(([scanType, data]) => ({
        scanType,
        name: getScanTypeName(scanType as ScanType),
        total: data.total,
        accepted: data.accepted,
        acceptanceRate: data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
      .slice(0, 8);
  }, [ideas]);

  // Calculate current vs previous period comparison
  const periodComparison = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentPeriod = ideas.filter(i => new Date(i.created_at) >= oneWeekAgo);
    const previousPeriod = ideas.filter(i => {
      const date = new Date(i.created_at);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    });

    const currentAcceptance = currentPeriod.filter(i => i.status === 'accepted').length;
    const previousAcceptance = previousPeriod.filter(i => i.status === 'accepted').length;

    const currentRate = currentPeriod.length > 0
      ? Math.round((currentAcceptance / currentPeriod.length) * 100)
      : 0;
    const previousRate = previousPeriod.length > 0
      ? Math.round((previousAcceptance / previousPeriod.length) * 100)
      : 0;

    return {
      currentTotal: currentPeriod.length,
      previousTotal: previousPeriod.length,
      currentRate,
      previousRate,
      rateChange: currentRate - previousRate,
      volumeChange: currentPeriod.length - previousPeriod.length,
    };
  }, [ideas]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Period Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComparisonCard
          title="This Week"
          value={periodComparison.currentTotal}
          subtitle="ideas generated"
          change={periodComparison.volumeChange}
          changeLabel="vs last week"
        />
        <ComparisonCard
          title="Acceptance Rate"
          value={`${periodComparison.currentRate}%`}
          subtitle="this week"
          change={periodComparison.rateChange}
          changeLabel="vs last week"
          isPercentage
        />
        <ComparisonCard
          title="Top Scan Type"
          value={scanTypeEffectiveness[0]?.name || 'N/A'}
          subtitle={`${scanTypeEffectiveness[0]?.acceptanceRate || 0}% acceptance`}
          icon={Target}
        />
      </div>

      {/* Acceptance Rate Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Acceptance Rate Trend</h3>
              <p className="text-xs text-gray-500">Last 8 weeks</p>
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrends}>
              <defs>
                <linearGradient id="acceptanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="week"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                domain={[0, 100]}
                axisLine={{ stroke: '#374151' }}
                label={{
                  value: '%',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#6b7280',
                  fontSize: 11,
                }}
              />
              <Tooltip content={<TrendTooltip />} />
              <Area
                type="monotone"
                dataKey="acceptanceRate"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#acceptanceGradient)"
                dot={{ fill: '#06b6d4', r: 4 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Scan Type Effectiveness */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Scan Type Effectiveness</h3>
              <p className="text-xs text-gray-500">By acceptance rate</p>
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scanTypeEffectiveness} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
              />
              <Tooltip content={<EffectivenessTooltip />} />
              <Bar
                dataKey="acceptanceRate"
                fill="#a855f7"
                radius={[0, 4, 4, 0]}
                background={{ fill: '#1f2937', radius: 4 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Volume Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Weekly Volume</h3>
              <p className="text-xs text-gray-500">Ideas generated vs accepted</p>
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="week"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
              />
              <Tooltip content={<VolumeTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
              />
              <Bar dataKey="total" name="Generated" fill="#6b7280" radius={[4, 4, 0, 0]} />
              <Bar dataKey="accepted" name="Accepted" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Format week label for display
 */
function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * Comparison card component
 */
function ComparisonCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  isPercentage = false,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  change?: number;
  changeLabel?: string;
  isPercentage?: boolean;
  icon?: React.ElementType;
}) {
  const isPositive = change !== undefined && change >= 0;
  const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            <ChangeIcon className="w-3 h-3" />
            <span>{isPositive ? '+' : ''}{change}{isPercentage ? 'pp' : ''}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{subtitle}</p>
      {changeLabel && (
        <p className="text-xs text-gray-600 mt-1">{changeLabel}</p>
      )}
    </motion.div>
  );
}

/**
 * Custom tooltip for trend chart
 */
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;

  return (
    <div className="bg-gray-950/95 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white mb-1">{label}</p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-gray-400">Acceptance Rate:</span>
          <span className="text-cyan-400 font-medium">{data?.acceptanceRate}%</span>
        </div>
        <div className="text-gray-500">
          {data?.accepted} of {data?.total} ideas
        </div>
      </div>
    </div>
  );
}

/**
 * Custom tooltip for effectiveness chart
 */
function EffectivenessTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;

  return (
    <div className="bg-gray-950/95 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white mb-1">{data?.name}</p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Acceptance:</span>
          <span className="text-purple-400 font-medium">{data?.acceptanceRate}%</span>
        </div>
        <div className="text-gray-500">
          {data?.accepted} of {data?.total} ideas
        </div>
      </div>
    </div>
  );
}

/**
 * Custom tooltip for volume chart
 */
function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-gray-950/95 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white mb-1">{label}</p>
      <div className="space-y-1 text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-400">{entry.name}:</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact trend indicator for headers
 */
export function TrendIndicator({
  current,
  previous,
  label,
  className = '',
}: {
  current: number;
  previous: number;
  label: string;
  className?: string;
}) {
  const change = current - previous;
  const percentChange = previous > 0 ? Math.round((change / previous) * 100) : 0;
  const isPositive = change >= 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-white">{current}</span>
      <div className={`flex items-center text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? (
          <TrendingUp className="w-3 h-3 mr-0.5" />
        ) : (
          <TrendingDown className="w-3 h-3 mr-0.5" />
        )}
        <span>{isPositive ? '+' : ''}{percentChange}%</span>
      </div>
    </div>
  );
}

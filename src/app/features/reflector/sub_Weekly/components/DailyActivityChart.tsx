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
import { Calendar, TrendingUp, MousePointerClick } from 'lucide-react';
import { DailyStats } from '../lib/types';
import { REFLECTOR_CHART_COLORS } from '../../lib/chartColors';
import ChartTooltip from '../../components/ChartTooltip';

export interface DailyBarClickData {
  dayName: string;
  date: string;
  status: 'accepted' | 'rejected' | 'pending';
  count: number;
  acceptanceRate: number;
}

interface DailyActivityChartProps {
  dailyBreakdown: DailyStats[];
  /** Called when a bar segment is clicked */
  onBarClick?: (data: DailyBarClickData) => void;
}

// Vibrant color palette with gradients — derived from semantic tokens
const COLORS = {
  accepted: {
    primary: REFLECTOR_CHART_COLORS.accepted,
    gradient: [REFLECTOR_CHART_COLORS.accepted, '#059669'],
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  rejected: {
    primary: REFLECTOR_CHART_COLORS.rejected,
    gradient: ['#f87171', '#dc2626'],
    glow: 'rgba(239, 68, 68, 0.3)',
  },
  pending: {
    primary: REFLECTOR_CHART_COLORS.pending,
    gradient: ['#c084fc', '#7c3aed'],
    glow: 'rgba(168, 85, 247, 0.3)',
  },
};

// Custom tooltip with glass morphism
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;

  return (
    <ChartTooltip accentColor="rgba(6, 182, 212, 0.5)" glowColor="rgba(6, 182, 212, 0.15)">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
        <p className="text-sm font-semibold text-white">{data?.fullName}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-emerald-400 to-emerald-600" />
            <span className="text-xs text-gray-400">Accepted</span>
          </div>
          <span className="text-xs font-mono text-emerald-400">{data?.accepted}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-red-400 to-red-600" />
            <span className="text-xs text-gray-400">Rejected</span>
          </div>
          <span className="text-xs font-mono text-red-400">{data?.rejected}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-purple-400 to-purple-600" />
            <span className="text-xs text-gray-400">Pending</span>
          </div>
          <span className="text-xs font-mono text-purple-400">{data?.pending}</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500">Acceptance Rate</span>
        <span className={`text-sm font-mono font-bold ${
          data?.acceptanceRate >= 70 ? 'text-emerald-400' :
          data?.acceptanceRate >= 40 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {data?.acceptanceRate}%
        </span>
      </div>
    </ChartTooltip>
  );
};

export default function DailyActivityChart({ dailyBreakdown, onBarClick }: DailyActivityChartProps) {
  const chartData = dailyBreakdown.map(day => ({
    name: day.dayName.substring(0, 3),
    fullName: day.dayName,
    date: day.date,
    total: day.total,
    accepted: day.accepted + day.implemented,
    rejected: day.rejected,
    pending: Math.max(0, day.total - day.accepted - day.rejected - day.implemented),
    acceptanceRate: day.acceptanceRate,
  }));

  const handleBarClick = (data: any, dataKey: string) => {
    if (!onBarClick || !data) return;
    const status = dataKey as 'accepted' | 'rejected' | 'pending';
    onBarClick({
      dayName: data.fullName,
      date: data.date,
      status,
      count: data[status] || 0,
      acceptanceRate: data.acceptanceRate,
    });
  };

  const maxValue = Math.max(...chartData.map(d => d.total), 1);
  const totalIdeas = chartData.reduce((sum, d) => sum + d.total, 0);
  const avgPerDay = Math.round(totalIdeas / 7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-cyan-500/20 rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.05)]"
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
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-200">Daily Activity</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">WEEKLY_BREAKDOWN</p>
          </div>
        </div>
        
        {/* Stats badges */}
        <div className="flex items-center gap-3">
          {onBarClick && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-cyan-500/20 bg-cyan-500/5">
              <MousePointerClick className="w-3 h-3 text-cyan-500/60" />
              <span className="text-[9px] font-mono text-cyan-500/60">CLICK_TO_DRILL</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
            <span className="text-xs font-mono text-gray-500">TOTAL:</span>
            <span className="text-sm font-mono font-bold text-cyan-400">{totalIdeas}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-mono text-gray-500">AVG/DAY:</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{avgPerDay}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 h-72">
        <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            responsive
            width="100%"
            height="100%"
          >
            <defs>
              {/* Gradient definitions */}
              <linearGradient id="acceptedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.75} />
              </linearGradient>
              
              {/* Glow filters */}
              <filter id="glowAccepted" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
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
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(6, 182, 212, 0.03)' }} 
            />
            <Bar
              dataKey="accepted"
              stackId="a"
              fill="url(#acceptedGradient)"
              stroke={REFLECTOR_CHART_COLORS.accepted}
              strokeWidth={0.5}
              className={onBarClick ? 'cursor-pointer' : ''}
              onClick={(data: any) => handleBarClick(data, 'accepted')}
            />
            <Bar
              dataKey="rejected"
              stackId="a"
              fill="url(#rejectedGradient)"
              stroke={REFLECTOR_CHART_COLORS.rejected}
              strokeWidth={0.5}
              className={onBarClick ? 'cursor-pointer' : ''}
              onClick={(data: any) => handleBarClick(data, 'rejected')}
            />
            <Bar
              dataKey="pending"
              stackId="a"
              fill="url(#pendingGradient)"
              stroke={REFLECTOR_CHART_COLORS.pending}
              strokeWidth={0.5}
              radius={[4, 4, 0, 0]}
              className={onBarClick ? 'cursor-pointer' : ''}
              onClick={(data: any) => handleBarClick(data, 'pending')}
            />
          </BarChart>
      </div>

      {/* Day stats footer */}
      <div className="relative z-10 mt-4 pt-4 border-t border-gray-800/50">
        <div className="grid grid-cols-7 gap-2">
          {chartData.map((day, index) => (
            <motion.div 
              key={day.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="text-center"
            >
              <div className={`text-lg font-mono font-bold ${
                day.total > 0 ? 'text-cyan-400' : 'text-gray-600'
              }`}>
                {day.total}
              </div>
              <div className={`text-[10px] font-mono ${
                day.acceptanceRate >= 70 ? 'text-emerald-400' : 
                day.acceptanceRate >= 40 ? 'text-amber-400' : 
                day.total > 0 ? 'text-red-400' : 'text-gray-600'
              }`}>
                {day.total > 0 ? `${day.acceptanceRate}%` : '—'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="relative z-10 flex justify-center gap-6 mt-4 pt-3 border-t border-gray-800/30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-mono text-gray-500">ACCEPTED</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-red-400 to-red-600 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
          <span className="text-xs font-mono text-gray-500">REJECTED</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-purple-400 to-purple-600 shadow-[0_0_6px_rgba(168,85,247,0.4)]" />
          <span className="text-xs font-mono text-gray-500">PENDING</span>
        </div>
      </div>
    </motion.div>
  );
}

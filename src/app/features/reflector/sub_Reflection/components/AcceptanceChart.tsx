'use client';

import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { ScanTypeStats } from '../lib/types';
import { SCAN_TYPE_CONFIG } from '../lib/config';

interface AcceptanceChartProps {
  scanTypeStats: ScanTypeStats[];
}

// Vibrant color palette matching app aesthetics
const CHART_COLORS = {
  high: { 
    fill: '#10b981', 
    stroke: '#34d399',
    glow: 'rgba(16, 185, 129, 0.4)',
    gradient: ['#10b981', '#059669']
  },
  medium: { 
    fill: '#f59e0b', 
    stroke: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.4)',
    gradient: ['#f59e0b', '#d97706']
  },
  low: { 
    fill: '#ef4444', 
    stroke: '#f87171',
    glow: 'rgba(239, 68, 68, 0.4)',
    gradient: ['#ef4444', '#dc2626']
  },
};

const getBarStyle = (ratio: number) => {
  if (ratio >= 70) return CHART_COLORS.high;
  if (ratio >= 40) return CHART_COLORS.medium;
  return CHART_COLORS.low;
};

// Custom bar with glow effect
const GlowBar = (props: any) => {
  const { x, y, width, height, fill, stroke, ratio } = props;
  const style = getBarStyle(ratio);
  
  return (
    <g>
      {/* Glow filter */}
      <defs>
        <filter id={`glow-${ratio}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`bar-gradient-${ratio}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={style.gradient[0]} stopOpacity={0.9} />
          <stop offset="100%" stopColor={style.gradient[1]} stopOpacity={0.7} />
        </linearGradient>
      </defs>
      
      {/* Glow layer */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={style.glow}
        rx={6}
        ry={6}
        filter={`url(#glow-${ratio})`}
        opacity={0.6}
      />
      
      {/* Main bar with gradient */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#bar-gradient-${ratio})`}
        stroke={style.stroke}
        strokeWidth={1}
        rx={6}
        ry={6}
        opacity={0.95}
      />
      
      {/* Top highlight */}
      <rect
        x={x + 2}
        y={y + 2}
        width={width - 4}
        height={4}
        fill="rgba(255,255,255,0.2)"
        rx={2}
      />
    </g>
  );
};

// Custom tooltip with glass morphism
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0]?.payload;
  const style = getBarStyle(data?.acceptanceRatio || 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gray-950/95 backdrop-blur-xl border rounded-xl px-4 py-3 shadow-2xl"
      style={{ borderColor: style.stroke, boxShadow: `0 0 20px ${style.glow}` }}
    >
      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l rounded-tl" style={{ borderColor: style.stroke }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r rounded-tr" style={{ borderColor: style.stroke }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l rounded-bl" style={{ borderColor: style.stroke }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r rounded-br" style={{ borderColor: style.stroke }} />
      
      <p className="text-sm font-semibold text-white mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: style.fill }} />
        <span className="text-gray-300 font-mono text-sm">
          {data?.acceptanceRatio}% 
          <span className="text-gray-500 ml-2">({data?.total} ideas)</span>
        </span>
      </div>
    </motion.div>
  );
};

export default function AcceptanceChart({ scanTypeStats }: AcceptanceChartProps) {
  // Filter out scan types with no ideas
  const chartData = scanTypeStats
    .filter(stat => stat.total > 0)
    .map(stat => ({
      name: SCAN_TYPE_CONFIG[stat.scanType]?.label || stat.scanType,
      scanType: stat.scanType,
      acceptanceRatio: stat.acceptanceRatio,
      total: stat.total
    }))
    .sort((a, b) => b.acceptanceRatio - a.acceptanceRatio);

  const avgAcceptance = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, d) => sum + d.acceptanceRatio, 0) / chartData.length)
    : 0;

  if (chartData.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-gray-700/40 rounded-2xl p-6 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Acceptance Ratios</h3>
        <div className="text-center py-8 text-gray-500 text-sm font-mono">
          NO_DATA_AVAILABLE
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-xl overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.05)]"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-cyan-500/5 blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Specialist Acceptance Ratios</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">PERFORMANCE_METRICS</p>
          </div>
        </div>
        
        {/* Average indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono text-gray-400">AVG:</span>
          <span className="text-sm font-mono font-bold text-cyan-400">{avgAcceptance}%</span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative z-10 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 70 }}
          >
            <defs>
              <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#374151" 
              opacity={0.2}
              vertical={false}
            />
            
            {/* Reference lines for thresholds */}
            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.4} />
            <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.4} />
            
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}
              domain={[0, 100]}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              label={{ 
                value: 'ACCEPTANCE %', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#6b7280',
                fontSize: 10,
                fontFamily: 'monospace'
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar 
              dataKey="acceptanceRatio" 
              shape={(props: any) => {
                const data = chartData[props.index];
                return <GlowBar {...props} ratio={data?.acceptanceRatio || 0} />;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="relative z-10 flex justify-center gap-6 mt-4 pt-4 border-t border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-mono text-gray-500">HIGH ≥70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-b from-amber-500 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span className="text-xs font-mono text-gray-500">MEDIUM 40-69%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <span className="text-xs font-mono text-gray-500">LOW &lt;40%</span>
        </div>
      </div>
    </motion.div>
  );
}

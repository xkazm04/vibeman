'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowRight, GitCompare, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { ComparisonStats } from '../lib/types';
import { SCAN_TYPE_CONFIG } from '../lib/config';

interface ComparisonViewProps {
  comparisonStats: ComparisonStats;
}

// Color palette
const CHART_COLORS = {
  high: { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16, 185, 129, 0.4)' },
  medium: { fill: '#f59e0b', stroke: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)' },
  low: { fill: '#ef4444', stroke: '#f87171', glow: 'rgba(239, 68, 68, 0.4)' },
};

const getBarColor = (ratio: number) => {
  if (ratio >= 70) return CHART_COLORS.high;
  if (ratio >= 40) return CHART_COLORS.medium;
  return CHART_COLORS.low;
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  const style = getBarColor(data?.acceptanceRatio || 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-950/95 backdrop-blur-xl border rounded-xl px-4 py-3 shadow-2xl"
      style={{ borderColor: style.stroke, boxShadow: `0 0 20px ${style.glow}` }}
    >
      <p className="text-sm font-semibold text-white mb-1">{label}</p>
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

export default function ComparisonView({ comparisonStats }: ComparisonViewProps) {
  const { period1, period2, period1Label, period2Label, differences } = comparisonStats;

  const getDifferenceIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (diff < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return 'text-emerald-400';
    if (diff < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const chartData1 = period1.scanTypes
    .filter(stat => stat.total > 0)
    .map(stat => ({
      name: SCAN_TYPE_CONFIG[stat.scanType]?.label || stat.scanType,
      scanType: stat.scanType,
      acceptanceRatio: stat.acceptanceRatio,
      total: stat.total
    }))
    .sort((a, b) => b.acceptanceRatio - a.acceptanceRatio);

  const chartData2 = period2.scanTypes
    .filter(stat => stat.total > 0)
    .map(stat => ({
      name: SCAN_TYPE_CONFIG[stat.scanType]?.label || stat.scanType,
      scanType: stat.scanType,
      acceptanceRatio: stat.acceptanceRatio,
      total: stat.total
    }))
    .sort((a, b) => b.acceptanceRatio - a.acceptanceRatio);

  return (
    <div className="space-y-6">
      {/* Overall Comparison Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-xl overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.05)]"
      >
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <GitCompare className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Period Comparison Summary</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Ideas Comparison */}
            <div className="bg-gray-950/60 border border-gray-700/40 rounded-xl p-4">
              <div className="text-xs font-mono text-gray-500 mb-3">TOTAL_IDEAS</div>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="text-sm text-gray-400">{period1Label}: <span className="text-gray-200 font-mono font-semibold">{period1.overall.total}</span></div>
                  <div className="text-sm text-gray-400">{period2Label}: <span className="text-gray-200 font-mono font-semibold">{period2.overall.total}</span></div>
                </div>
                <div className={`flex items-center gap-1 text-xl font-mono font-bold ${getDifferenceColor(differences.totalIdeasDiff)}`}>
                  {getDifferenceIcon(differences.totalIdeasDiff)}
                  {Math.abs(differences.totalIdeasDiff)}
                </div>
              </div>
            </div>

            {/* Acceptance Rate Comparison */}
            <div className="bg-gray-950/60 border border-gray-700/40 rounded-xl p-4">
              <div className="text-xs font-mono text-gray-500 mb-3">ACCEPTANCE_RATE</div>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="text-sm text-gray-400">{period1Label}: <span className="text-gray-200 font-mono font-semibold">{period1.overall.acceptanceRatio}%</span></div>
                  <div className="text-sm text-gray-400">{period2Label}: <span className="text-gray-200 font-mono font-semibold">{period2.overall.acceptanceRatio}%</span></div>
                </div>
                <div className={`flex items-center gap-1 text-xl font-mono font-bold ${getDifferenceColor(differences.overallAcceptanceDiff)}`}>
                  {getDifferenceIcon(differences.overallAcceptanceDiff)}
                  {Math.abs(differences.overallAcceptanceDiff).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-gray-950/60 border border-gray-700/40 rounded-xl p-4">
              <div className="text-xs font-mono text-gray-500 mb-3">STATUS_BREAKDOWN</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Accepted:</span>
                  <span className="text-emerald-400 font-mono">{period1.overall.accepted} <ArrowRight className="inline w-3 h-3 text-gray-600" /> {period2.overall.accepted}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Rejected:</span>
                  <span className="text-red-400 font-mono">{period1.overall.rejected} <ArrowRight className="inline w-3 h-3 text-gray-600" /> {period2.overall.rejected}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Implemented:</span>
                  <span className="text-cyan-400 font-mono">{period1.overall.implemented} <ArrowRight className="inline w-3 h-3 text-gray-600" /> {period2.overall.implemented}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Side-by-Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period 1 Chart */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-gray-200">{period1Label}</h3>
              </div>
              <span className="text-xs font-mono text-gray-500">{period1.overall.total} ideas</span>
            </div>
            {chartData1.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm font-mono">NO_DATA</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData1} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <defs>
                      <linearGradient id="p1High" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="p1Medium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="p1Low" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                    <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.3} />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.3} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }} domain={[0, 100]} axisLine={{ stroke: '#374151' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6,182,212,0.02)' }} />
                    <Bar dataKey="acceptanceRatio" radius={[6, 6, 0, 0]}>
                      {chartData1.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.acceptanceRatio >= 70 ? 'url(#p1High)' : entry.acceptanceRatio >= 40 ? 'url(#p1Medium)' : 'url(#p1Low)'}
                          stroke={getBarColor(entry.acceptanceRatio).stroke}
                          strokeWidth={0.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>

        {/* Period 2 Chart */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.05)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-gray-200">{period2Label}</h3>
              </div>
              <span className="text-xs font-mono text-gray-500">{period2.overall.total} ideas</span>
            </div>
            {chartData2.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm font-mono">NO_DATA</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData2} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <defs>
                      <linearGradient id="p2High" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="p2Medium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="p2Low" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                    <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.3} />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.3} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }} domain={[0, 100]} axisLine={{ stroke: '#374151' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.02)' }} />
                    <Bar dataKey="acceptanceRatio" radius={[6, 6, 0, 0]}>
                      {chartData2.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.acceptanceRatio >= 70 ? 'url(#p2High)' : entry.acceptanceRatio >= 40 ? 'url(#p2Medium)' : 'url(#p2Low)'}
                          stroke={getBarColor(entry.acceptanceRatio).stroke}
                          strokeWidth={0.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Scan Type Differences Table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.05)]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <span className="text-xs font-mono text-amber-400">▸</span>
            Scan Type Changes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/40">
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-mono font-medium">SPECIALIST</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-mono font-medium">{period1Label}</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-mono font-medium">{period2Label}</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-mono font-medium">CHANGE</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-mono font-medium">IDEAS Δ</th>
                </tr>
              </thead>
              <tbody>
                {differences.scanTypes
                  .sort((a, b) => {
                    const labelA = SCAN_TYPE_CONFIG[a.scanType]?.label || a.scanType;
                    const labelB = SCAN_TYPE_CONFIG[b.scanType]?.label || b.scanType;
                    return labelA.localeCompare(labelB);
                  })
                  .map((diff) => {
                    const p1Stats = period1.scanTypes.find(s => s.scanType === diff.scanType);
                    const p2Stats = period2.scanTypes.find(s => s.scanType === diff.scanType);
                    if (!p1Stats && !p2Stats) return null;

                    return (
                      <tr key={diff.scanType} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                        <td className="py-3 px-4 text-gray-300 font-medium">
                          {SCAN_TYPE_CONFIG[diff.scanType]?.label || diff.scanType}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 font-mono">
                          {p1Stats ? `${p1Stats.acceptanceRatio}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 font-mono">
                          {p2Stats ? `${p2Stats.acceptanceRatio}%` : '—'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-semibold ${getDifferenceColor(diff.acceptanceRatioDiff)}`}>
                          <div className="flex items-center justify-end gap-1">
                            {getDifferenceIcon(diff.acceptanceRatioDiff)}
                            {diff.acceptanceRatioDiff > 0 ? '+' : ''}{diff.acceptanceRatioDiff.toFixed(1)}%
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono ${getDifferenceColor(diff.totalDiff)}`}>
                          {diff.totalDiff > 0 ? '+' : ''}{diff.totalDiff}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

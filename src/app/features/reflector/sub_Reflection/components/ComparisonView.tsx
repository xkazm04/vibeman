'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ComparisonStats } from '../lib/types';
import { SCAN_TYPE_CONFIG } from '../lib/config';

interface ComparisonViewProps {
  comparisonStats: ComparisonStats;
}

export default function ComparisonView({ comparisonStats }: ComparisonViewProps) {
  const { period1, period2, period1Label, period2Label, differences } = comparisonStats;

  const getBarColor = (ratio: number) => {
    if (ratio >= 70) return '#4ade80';
    if (ratio <= 30) return '#f87171';
    return '#fbbf24';
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (diff < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return 'text-green-400';
    if (diff < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const chartData1 = period1.scanTypes
    .filter(stat => stat.total > 0)
    .map(stat => ({
      name: SCAN_TYPE_CONFIG[stat.scanType].label,
      scanType: stat.scanType,
      acceptanceRatio: stat.acceptanceRatio,
      total: stat.total
    }))
    .sort((a, b) => b.acceptanceRatio - a.acceptanceRatio);

  const chartData2 = period2.scanTypes
    .filter(stat => stat.total > 0)
    .map(stat => ({
      name: SCAN_TYPE_CONFIG[stat.scanType].label,
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
        className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
      >
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Period Comparison Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Ideas Comparison */}
          <div className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Total Ideas</div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-gray-400">{period1Label}: <span className="text-gray-200 font-mono">{period1.overall.total}</span></div>
                <div className="text-sm text-gray-400">{period2Label}: <span className="text-gray-200 font-mono">{period2.overall.total}</span></div>
              </div>
              <div className={`flex items-center gap-1 text-lg font-bold ${getDifferenceColor(differences.totalIdeasDiff)}`}>
                {getDifferenceIcon(differences.totalIdeasDiff)}
                {Math.abs(differences.totalIdeasDiff)}
              </div>
            </div>
          </div>

          {/* Acceptance Rate Comparison */}
          <div className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Acceptance Rate</div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-gray-400">{period1Label}: <span className="text-gray-200 font-mono">{period1.overall.acceptanceRatio}%</span></div>
                <div className="text-sm text-gray-400">{period2Label}: <span className="text-gray-200 font-mono">{period2.overall.acceptanceRatio}%</span></div>
              </div>
              <div className={`flex items-center gap-1 text-lg font-bold ${getDifferenceColor(differences.overallAcceptanceDiff)}`}>
                {getDifferenceIcon(differences.overallAcceptanceDiff)}
                {Math.abs(differences.overallAcceptanceDiff).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Status Breakdown</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Accepted:</span>
                <span className="text-green-400">{period1.overall.accepted} <ArrowRight className="inline w-3 h-3" /> {period2.overall.accepted}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Rejected:</span>
                <span className="text-red-400">{period1.overall.rejected} <ArrowRight className="inline w-3 h-3" /> {period2.overall.rejected}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Implemented:</span>
                <span className="text-blue-400">{period1.overall.implemented} <ArrowRight className="inline w-3 h-3" /> {period2.overall.implemented}</span>
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
          className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">{period1Label}</h3>
            <div className="text-xs text-gray-500">{period1.overall.total} ideas</div>
          </div>
          {chartData1.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No data</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData1} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Acceptance %', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
                    itemStyle={{ color: '#d1d5db' }}
                    formatter={(value: number, name: string, props: { payload: { total: number } }) => [
                      `${value}% (${props.payload.total} ideas)`,
                      'Acceptance'
                    ]}
                  />
                  <Bar dataKey="acceptanceRatio" radius={[8, 8, 0, 0]}>
                    {chartData1.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.acceptanceRatio)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Period 2 Chart */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">{period2Label}</h3>
            <div className="text-xs text-gray-500">{period2.overall.total} ideas</div>
          </div>
          {chartData2.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No data</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData2} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Acceptance %', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
                    itemStyle={{ color: '#d1d5db' }}
                    formatter={(value: number, name: string, props: { payload: { total: number } }) => [
                      `${value}% (${props.payload.total} ideas)`,
                      'Acceptance'
                    ]}
                  />
                  <Bar dataKey="acceptanceRatio" radius={[8, 8, 0, 0]}>
                    {chartData2.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.acceptanceRatio)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Scan Type Differences Table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
      >
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Scan Type Changes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/40">
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Specialist</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">{period1Label} Rate</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">{period2Label} Rate</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Change</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Ideas Δ</th>
              </tr>
            </thead>
            <tbody>
              {differences.scanTypes
                .sort((a, b) => Math.abs(b.acceptanceRatioDiff) - Math.abs(a.acceptanceRatioDiff))
                .map((diff, index) => {
                  const p1Stats = period1.scanTypes.find(s => s.scanType === diff.scanType);
                  const p2Stats = period2.scanTypes.find(s => s.scanType === diff.scanType);

                  if (!p1Stats && !p2Stats) return null;

                  return (
                    <tr key={diff.scanType} className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors">
                      <td className="py-3 px-3 text-gray-300">
                        {SCAN_TYPE_CONFIG[diff.scanType]?.label || diff.scanType}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-400 font-mono">
                        {p1Stats ? `${p1Stats.acceptanceRatio}%` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-400 font-mono">
                        {p2Stats ? `${p2Stats.acceptanceRatio}%` : '-'}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${getDifferenceColor(diff.acceptanceRatioDiff)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {getDifferenceIcon(diff.acceptanceRatioDiff)}
                          {diff.acceptanceRatioDiff > 0 ? '+' : ''}{diff.acceptanceRatioDiff.toFixed(1)}%
                        </div>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono ${getDifferenceColor(diff.totalDiff)}`}>
                        {diff.totalDiff > 0 ? '+' : ''}{diff.totalDiff}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

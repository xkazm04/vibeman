'use client';

import { motion } from 'framer-motion';
import { Zap, Settings } from 'lucide-react';
import { PreviewProps } from './types';

export function StatsBarChartPreview({ props }: PreviewProps) {
  const showTotal = props.showTotal !== false;
  const stats = [
    { label: 'Feature', value: 24, color: 'bg-cyan-500/80' },
    { label: 'Bug Fix', value: 18, color: 'bg-green-500/80' },
    { label: 'Refactor', value: 12, color: 'bg-purple-500/80' },
    { label: 'Security', value: 8, color: 'bg-red-500/80' },
  ];
  const maxCount = Math.max(...stats.map(s => s.value));
  const total = stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="w-72 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-white">Top Activity</span>
        </div>
        {showTotal && (
          <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
            {total} total
          </span>
        )}
      </div>
      <div className="space-y-2">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
            className="space-y-1"
          >
            <div className="flex justify-between text-xs">
              <span className="text-gray-300">{stat.label}</span>
              <span className="text-gray-400 font-mono">{stat.value}</span>
            </div>
            <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stat.value / maxCount) * 100}%` }}
                transition={{ duration: 0.5, delay: idx * 0.05 + 0.2 }}
                className={`h-full ${stat.color} rounded-full`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function StackedBarChartPreview({ props }: PreviewProps) {
  const showTotalBadge = props.showTotalBadge !== false;
  const showAvgBadge = props.showAvgBadge !== false;

  const data = [
    { name: 'Mon', accepted: 5, rejected: 2, pending: 3 },
    { name: 'Tue', accepted: 8, rejected: 1, pending: 4 },
    { name: 'Wed', accepted: 6, rejected: 3, pending: 2 },
    { name: 'Thu', accepted: 10, rejected: 2, pending: 1 },
    { name: 'Fri', accepted: 7, rejected: 4, pending: 3 },
  ];

  const totalValue = data.reduce((sum, d) => sum + d.accepted + d.rejected + d.pending, 0);
  const maxValue = Math.max(...data.map(d => d.accepted + d.rejected + d.pending));

  return (
    <div className="w-80 bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-cyan-500/20 rounded-xl p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-sm font-semibold text-gray-200">Daily Activity</span>
        </div>
        <div className="flex items-center gap-2">
          {showTotalBadge && (
            <span className="text-xs font-mono text-cyan-400 bg-gray-800/60 px-2 py-0.5 rounded">
              {totalValue}
            </span>
          )}
          {showAvgBadge && (
            <span className="text-xs font-mono text-emerald-400 bg-gray-800/60 px-2 py-0.5 rounded">
              {Math.round(totalValue / 5)}/d
            </span>
          )}
        </div>
      </div>
      <div className="flex items-end gap-2 h-24">
        {data.map((d, idx) => {
          const total = d.accepted + d.rejected + d.pending;
          const height = (total / maxValue) * 100;
          return (
            <div key={d.name} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="w-full rounded-t flex flex-col-reverse overflow-hidden"
              >
                <div
                  style={{ height: `${(d.accepted / total) * 100}%` }}
                  className="bg-gradient-to-b from-emerald-400 to-emerald-600"
                />
                <div
                  style={{ height: `${(d.rejected / total) * 100}%` }}
                  className="bg-gradient-to-b from-red-400 to-red-600"
                />
                <div
                  style={{ height: `${(d.pending / total) * 100}%` }}
                  className="bg-gradient-to-b from-amber-400 to-amber-600"
                />
              </motion.div>
              <span className="text-[10px] font-mono text-gray-500 mt-1">{d.name}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 mt-3 pt-2 border-t border-gray-800/30">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-gradient-to-b from-emerald-400 to-emerald-600" />
          <span className="text-[10px] font-mono text-gray-500">ACC</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-gradient-to-b from-red-400 to-red-600" />
          <span className="text-[10px] font-mono text-gray-500">REJ</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-gradient-to-b from-amber-400 to-amber-600" />
          <span className="text-[10px] font-mono text-gray-500">PND</span>
        </div>
      </div>
    </div>
  );
}

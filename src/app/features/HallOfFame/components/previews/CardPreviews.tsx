'use client';

import { motion } from 'framer-motion';
import { Settings, Star, Zap } from 'lucide-react';
import { PreviewProps } from './types';

export function CompactListPreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'pending';
  const statusClasses: Record<string, string> = {
    pending: 'border-gray-600/40 bg-gray-800/20',
    accepted: 'border-green-500/40 bg-green-900/10',
    rejected: 'border-red-500/40 bg-red-900/10',
    implemented: 'border-amber-500/40 bg-amber-900/10',
  };

  const items = [
    { id: '1', title: 'Add dark mode', emoji: '🌙' },
    { id: '2', title: 'Fix login bug', emoji: '🐛' },
    { id: '3', title: 'Improve performance', emoji: '⚡' },
  ];

  return (
    <div className="w-48 bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden">
      <div className="px-2 py-1.5 bg-gray-800/60 border-b border-gray-700/40 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300">Ideas Buffer</span>
        <span className="text-[10px] text-gray-500 font-mono">{items.length}</span>
      </div>
      <div className="p-1.5 space-y-1">
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
            className={`flex items-center gap-1.5 px-1.5 py-1 rounded border cursor-pointer ${statusClasses[status]}`}
            whileHover={{ x: 2 }}
          >
            <span className="text-xs">{item.emoji}</span>
            <span className="flex-1 text-[10px] text-gray-200 truncate">{item.title}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PerformanceCardPreview({ props }: PreviewProps) {
  const borderColor = (props.borderColor as string) || 'border-violet-500/20';

  return (
    <div className={`w-72 bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-violet-500/10 rounded-lg border border-violet-500/30">
          <Settings className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Performance</h3>
          <span className="text-[10px] font-mono text-gray-500">3 ACTIVE</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] font-semibold text-emerald-300">Top</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-300">🐛 Bug Hunter</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">92%</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-red-950/30 border border-red-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-semibold text-red-300">Attention</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-300">🔧 Refactor</span>
            <span className="text-[10px] font-mono font-bold text-red-400">34%</span>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { emoji: '✨', label: 'Feature', rate: 75, trend: 'up' },
          { emoji: '🐛', label: 'Bug Fix', rate: 92, trend: 'up' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/60 border border-gray-700/30"
          >
            <span className="text-sm">{item.emoji}</span>
            <span className="flex-1 text-[10px] text-gray-300">{item.label}</span>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: item.rate >= 70 ? '#10b981' : '#f59e0b' }}
            >
              {item.rate}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

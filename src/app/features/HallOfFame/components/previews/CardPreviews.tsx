'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Settings, Star, Zap } from 'lucide-react';
import { PreviewProps } from './types';

export function DecisionCardPreview({ props }: PreviewProps) {
  const severity = (props.severity as string) || 'info';
  const size = (props.size as string) || 'md';

  const colors = {
    info: { bg: 'from-blue-600/40 to-cyan-500/40', border: 'border-cyan-500/50', text: 'text-cyan-300' },
    warning: { bg: 'from-yellow-600/40 to-amber-500/40', border: 'border-yellow-500/50', text: 'text-yellow-300' },
    error: { bg: 'from-red-600/40 to-rose-500/40', border: 'border-red-500/50', text: 'text-red-300' },
    success: { bg: 'from-green-600/40 to-emerald-500/40', border: 'border-green-500/50', text: 'text-green-300' },
  };

  const sizeClasses = { sm: 'p-3 text-sm', md: 'p-4', lg: 'p-6 text-lg' };
  const c = colors[severity as keyof typeof colors] || colors.info;
  const s = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;

  return (
    <div className={`rounded-xl bg-gradient-to-br ${c.bg} border ${c.border} ${s}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${c.text}`}>
          <CheckCircle className="w-4 h-4" />
        </div>
        <h4 className="font-semibold text-white">Decision Card</h4>
      </div>
      <p className={`${c.text} text-sm opacity-80`}>This is a {severity} severity card.</p>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors">
          Action
        </button>
      </div>
    </div>
  );
}

export function CyberCardPreview({ props }: PreviewProps) {
  const variant = (props.variant as string) || 'default';

  const variants: Record<string, string> = {
    default: 'bg-gray-900/50 border-white/10',
    dark: 'bg-black/60 border-gray-800',
    glow: 'bg-gray-900/50 border-cyan-500/30 shadow-lg shadow-cyan-500/10',
  };

  return (
    <motion.div
      className={`p-6 rounded-xl border ${variants[variant]} backdrop-blur-sm`}
      whileHover={{ scale: 1.02 }}
    >
      <h3 className="text-lg font-semibold text-white mb-2">CyberCard</h3>
      <p className="text-gray-400 text-sm">Futuristic design with {variant} variant</p>
    </motion.div>
  );
}

export function GlowCardPreview({ props }: PreviewProps) {
  const glowColor = (props.glowColor as string) || 'cyan';

  const colors: Record<string, string> = {
    cyan: 'shadow-cyan-500/20 border-cyan-500/30',
    blue: 'shadow-blue-500/20 border-blue-500/30',
    green: 'shadow-green-500/20 border-green-500/30',
    red: 'shadow-red-500/20 border-red-500/30',
  };

  return (
    <motion.div
      className={`p-6 rounded-xl bg-gray-900/80 backdrop-blur-sm border shadow-lg ${colors[glowColor]}`}
      whileHover={{ scale: 1.02 }}
    >
      <h3 className="text-lg font-semibold text-white mb-2">GlowCard</h3>
      <p className="text-gray-400 text-sm">With {glowColor} glow effect</p>
    </motion.div>
  );
}

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

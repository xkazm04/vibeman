'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target, Trophy, AlertTriangle, Users, LucideIcon } from 'lucide-react';

export interface PerformanceItem {
  id: string;
  label: string;
  emoji?: string;
  total: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface TopPerformer {
  id: string;
  label: string;
  emoji?: string;
  value: number;
}

export interface AttentionItem {
  id: string;
  label: string;
  emoji?: string;
  reason: string;
  value: number;
}

export interface PerformanceCardProps {
  /** Card title */
  title: string;
  /** Subtitle text */
  subtitle?: string;
  /** Header icon */
  icon?: LucideIcon;
  /** Performance items to display */
  items: PerformanceItem[];
  /** Top performers list */
  topPerformers?: TopPerformer[];
  /** Items needing attention */
  needsAttention?: AttentionItem[];
  /** Border color class */
  borderColor?: string;
  /** Max height for scrollable list */
  maxHeight?: string;
}

function PerformanceRow({ item, index }: { item: PerformanceItem; index: number }) {
  const getTrendIcon = () => {
    if (item.trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (item.trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-gray-600" />;
  };

  const getAcceptanceStyle = (rate: number) => {
    if (rate >= 70) return { color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' };
    if (rate >= 40) return { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' };
    return { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' };
  };

  const style = getAcceptanceStyle(item.acceptanceRate);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ scale: 1.01, x: 4 }}
      className="relative flex items-center gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-700/30 hover:border-gray-600/50 transition-all cursor-default group"
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
        style={{ backgroundColor: style.color, boxShadow: `0 0 10px ${style.glow}` }}
      />

      {/* Emoji with glow */}
      <div className="relative">
        <div
          className="text-2xl transition-transform group-hover:scale-110"
          style={{ filter: `drop-shadow(0 0 8px ${style.glow})` }}
        >
          {item.emoji || '🔧'}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
          {item.label}
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-mono">
          <span className="text-gray-400">{item.total} total</span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400/80">{item.accepted} ✓</span>
          <span className="text-red-400/80">{item.rejected} ✗</span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        <div
          className="text-xl font-mono font-bold"
          style={{ color: style.color, textShadow: `0 0 15px ${style.glow}` }}
        >
          {item.acceptanceRate}%
        </div>
        <div className="flex items-center gap-1.5 justify-end text-xs mt-0.5">
          {getTrendIcon()}
          <span className={`font-mono ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * PerformanceCard - A card showing performance metrics with trends
 *
 * Features:
 * - Performance items with acceptance rates
 * - Trend indicators (up/down/stable)
 * - Top performers section
 * - Needs attention section
 * - Color-coded metrics
 */
export default function PerformanceCard({
  title,
  subtitle,
  icon: Icon = Users,
  items,
  topPerformers = [],
  needsAttention = [],
  borderColor = 'border-violet-500/20',
  maxHeight = 'max-h-80',
}: PerformanceCardProps) {
  const activeItems = items.filter(s => s.total > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border ${borderColor} rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.05)]`}
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-violet-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-fuchsia-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <Icon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-200">{title}</h3>
            {subtitle && <p className="text-xs font-mono text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <Target className="w-5 h-5 text-violet-400/50" />
      </div>

      {/* Top Performers & Attention Needed */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {topPerformers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
              <span className="text-sm font-semibold text-emerald-300">Top Performers</span>
            </div>
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.emoji || '🎯'}</span>
                    <span className="text-xs text-gray-300 font-medium">{p.label}</span>
                  </div>
                  <span
                    className="text-sm font-mono font-bold text-emerald-400"
                    style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}
                  >
                    {p.value}%
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {needsAttention.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
              <span className="text-sm font-semibold text-red-300">Needs Attention</span>
            </div>
            <div className="space-y-2">
              {needsAttention.slice(0, 3).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.emoji || '⚠️'}</span>
                    <span className="text-xs text-gray-300 font-medium">{p.label}</span>
                  </div>
                  <span
                    className="text-sm font-mono font-bold text-red-400"
                    style={{ textShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }}
                  >
                    {p.value}%
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state placeholders */}
        {topPerformers.length === 0 && (
          <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-700/30 flex items-center justify-center">
            <span className="text-xs font-mono text-gray-600">NO_TOP_PERFORMERS</span>
          </div>
        )}
        {needsAttention.length === 0 && (
          <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-700/30 flex items-center justify-center">
            <span className="text-xs font-mono text-gray-600">ALL_PERFORMING_WELL</span>
          </div>
        )}
      </div>

      {/* Performance List */}
      <div className={`relative z-10 space-y-2 ${maxHeight} overflow-y-auto pr-2 custom-scrollbar`}>
        {activeItems.length === 0 ? (
          <div className="text-center py-12">
            <Icon className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-mono text-gray-600">NO_ACTIVITY</p>
            <p className="text-xs text-gray-700 mt-1">No data available</p>
          </div>
        ) : (
          activeItems.map((item, index) => (
            <PerformanceRow key={item.id} item={item} index={index} />
          ))
        )}
      </div>
    </motion.div>
  );
}

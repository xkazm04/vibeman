'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, TrendingDown, Minus, Shield, Zap, GitBranch, Activity } from 'lucide-react';
import type { HealthSnapshot, CategoryScores } from '@/lib/metrics/projectHealthEngine';

interface ProjectHealthCardProps {
  snapshot: HealthSnapshot | null;
  isLoading: boolean;
  onRecalculate?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  excellent: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  good:      { bg: 'bg-cyan-500/10', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  fair:      { bg: 'bg-yellow-500/10', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  poor:      { bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  critical:  { bg: 'bg-red-500/10', text: 'text-red-400', glow: 'shadow-red-500/20' },
};

const CATEGORY_META: { key: keyof CategoryScores; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'codeQuality', label: 'Code Quality', icon: Shield, color: '#22c55e' },
  { key: 'buildStability', label: 'Build Stability', icon: Zap, color: '#06b6d4' },
  { key: 'pipelineHealth', label: 'Pipeline', icon: GitBranch, color: '#a855f7' },
  { key: 'taskVelocity', label: 'Velocity', icon: Activity, color: '#f59e0b' },
];

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

export default function ProjectHealthCard({ snapshot, isLoading, onRecalculate }: ProjectHealthCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-12 w-20 bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-2 bg-zinc-800 rounded" />)}
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-center">
        <Heart className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 mb-3">No health data yet</p>
        {onRecalculate && (
          <button
            onClick={onRecalculate}
            className="px-3 py-1.5 text-xs text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
          >
            Calculate Now
          </button>
        )}
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[snapshot.status] || STATUS_COLORS.fair;
  const TrendIcon = snapshot.trendDirection === 'up' ? TrendingUp : snapshot.trendDirection === 'down' ? TrendingDown : Minus;
  const trendColor = snapshot.trendDirection === 'up' ? 'text-emerald-400' : snapshot.trendDirection === 'down' ? 'text-red-400' : 'text-zinc-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg ${statusStyle.glow}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className={`w-4 h-4 ${statusStyle.text}`} />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Project Health</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span className={`text-xs ${trendColor}`}>{snapshot.trend > 0 ? '+' : ''}{snapshot.trend}</span>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end gap-3 mb-5">
        <span className={`text-4xl font-bold tabular-nums ${statusStyle.text}`}>{snapshot.overallScore}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text} mb-1.5`}>
          {snapshot.status.charAt(0).toUpperCase() + snapshot.status.slice(1)}
        </span>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {CATEGORY_META.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="flex items-center gap-2.5">
            <Icon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <span className="text-xs text-zinc-400 w-20 flex-shrink-0">{label}</span>
            <div className="flex-1">
              <ScoreBar value={snapshot.categoryScores[key]} color={color} />
            </div>
            <span className="text-xs text-zinc-300 tabular-nums w-8 text-right">{snapshot.categoryScores[key]}</span>
          </div>
        ))}
      </div>

      {/* Recalculate button */}
      {onRecalculate && (
        <button
          onClick={onRecalculate}
          className="mt-4 w-full py-1.5 text-xs text-zinc-500 hover:text-cyan-400 border border-zinc-800 hover:border-cyan-500/30 rounded-lg transition-colors"
        >
          Recalculate
        </button>
      )}
    </motion.div>
  );
}

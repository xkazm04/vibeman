'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Zap, Clock, CheckCircle2, TrendingUp, Loader2, Radio } from 'lucide-react';
import type { RealtimeStats } from '@/app/features/Personas/hooks/useRealtimeEvents';

interface Props {
  stats: RealtimeStats;
  isPaused: boolean;
  isConnected: boolean;
  testFlowLoading: boolean;
  onPause: () => void;
  onTestFlow: () => void;
}

function AnimatedNumber({ value, color }: { value: string | number; color?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={String(value)}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className={`font-bold text-lg ${color || 'text-foreground'}`}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export default function RealtimeStatsBar({ stats, isPaused, isConnected, testFlowLoading, onPause, onTestFlow }: Props) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-secondary/30 border-b border-primary/15">
      {/* Stats */}
      <div className="flex items-center gap-6">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            {isPaused ? 'Paused' : isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>

        {/* Events/min */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <AnimatedNumber value={stats.eventsPerMinute} color="text-purple-400" />
            <span className="text-[9px] text-muted-foreground/30 -mt-1">events/min</span>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <AnimatedNumber value={stats.pendingCount} color="text-amber-400" />
            <span className="text-[9px] text-muted-foreground/30 -mt-1">pending</span>
          </div>
        </div>

        {/* Success rate */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
            stats.successRate >= 90 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
          }`}>
            <CheckCircle2 className={`w-3.5 h-3.5 ${stats.successRate >= 90 ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div className="flex flex-col">
            <AnimatedNumber value={`${stats.successRate}%`} color={stats.successRate >= 90 ? 'text-emerald-400' : 'text-red-400'} />
            <span className="text-[9px] text-muted-foreground/30 -mt-1">success</span>
          </div>
        </div>

        {/* Total in window */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <AnimatedNumber value={stats.totalInWindow} color="text-blue-400" />
            <span className="text-[9px] text-muted-foreground/30 -mt-1">in window</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Test Flow button */}
        <button
          onClick={onTestFlow}
          disabled={testFlowLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-500/15 to-primary/15 border border-purple-500/25 text-purple-300 hover:from-purple-500/25 hover:to-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {testFlowLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Radio className="w-3.5 h-3.5" />
          )}
          Test Flow
        </button>

        {/* Pause/Resume */}
        <button
          onClick={onPause}
          className={`p-1.5 rounded-lg border transition-all ${
            isPaused
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'border-primary/15 text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/50'
          }`}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

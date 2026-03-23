'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, CheckCircle2, Clock, Zap, GitCommit, FileText,
  ChevronDown, ChevronRight, Loader2, RefreshCw, Check, X,
  ListChecks, Sparkles, TrendingUp,
} from 'lucide-react';
import GlassCard from '@/components/cards/GlassCard';
import { duration, easing } from '@/lib/motion';

export interface GoalSignal {
  id: string;
  signal_type: string;
  source_title: string | null;
  description: string | null;
  progress_delta: number;
  created_at: string;
}

export interface SubGoal {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'skipped';
  progress: number;
  order_index: number;
}

export interface LifecycleData {
  goal: {
    id: string;
    lifecycle_status?: string;
    inferred_progress?: number;
    signal_count?: number;
    last_signal_at?: string;
  };
  signals: GoalSignal[];
  subGoals: SubGoal[];
  subGoalStats: { total: number; done: number; inProgress: number; open: number };
  inferredProgress: number;
  signalCounts: Record<string, number>;
  shouldAutoComplete: boolean;
  lastActivity: string | null;
}

interface GoalLifecyclePanelProps {
  data: LifecycleData;
  projectId: string;
  onRefresh: () => void;
}

const SIGNAL_ICONS: Record<string, React.ElementType> = {
  implementation_log: FileText,
  requirement_completed: CheckCircle2,
  git_commit: GitCommit,
  scan_completed: Zap,
  idea_implemented: Sparkles,
  context_updated: RefreshCw,
  manual_update: Check,
};

const SIGNAL_COLORS: Record<string, string> = {
  implementation_log: 'text-blue-400',
  requirement_completed: 'text-green-400',
  git_commit: 'text-purple-400',
  scan_completed: 'text-yellow-400',
  idea_implemented: 'text-pink-400',
  context_updated: 'text-cyan-400',
  manual_update: 'text-gray-400',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function GoalLifecyclePanel({ data, projectId, onRefresh }: GoalLifecyclePanelProps) {
  const [localData, setLocalData] = useState<LifecycleData>(data);
  const [showSignals, setShowSignals] = useState(false);
  const [catchingUp, setCatchingUp] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Sync local data when parent provides new data
  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  const goalId = localData.goal.id;

  const handleCatchUp = async () => {
    setCatchingUp(true);
    try {
      await fetch('/api/goals/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'catch_up', projectId }),
      });
      onRefresh();
    } finally {
      setCatchingUp(false);
    }
  };

  const handleConfirmComplete = async () => {
    setConfirming(true);
    try {
      await fetch('/api/goals/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_complete', goalId }),
      });
      onRefresh();
    } finally {
      setConfirming(false);
    }
  };

  const handleDismissComplete = async () => {
    await fetch('/api/goals/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss_complete', goalId }),
    });
    onRefresh();
  };

  const handleSubGoalStatusChange = async (subGoalId: string, newStatus: string) => {
    // Optimistic update — mutate local state immediately
    setLocalData(prev => {
      const subGoals = prev.subGoals.map(sg =>
        sg.id === subGoalId ? { ...sg, status: newStatus as SubGoal['status'] } : sg
      );
      const done = subGoals.filter(sg => sg.status === 'done').length;
      const inProgress = subGoals.filter(sg => sg.status === 'in_progress').length;
      const open = subGoals.filter(sg => sg.status === 'open').length;
      return {
        ...prev,
        subGoals,
        subGoalStats: { ...prev.subGoalStats, done, inProgress, open },
      };
    });

    // Fire-and-forget — no refetch needed
    fetch('/api/goals/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_sub_goal',
        subGoalId,
        updates: { status: newStatus },
      }),
    }).catch(() => {
      // Revert on failure by refetching
      onRefresh();
    });
  };

  const progress = localData.inferredProgress;
  const totalSignals = localData.signals.length;
  const lifecycleStatus = localData.goal.lifecycle_status || 'manual';

  return (
    <div className="space-y-4">
      {/* Progress Bar Section */}
      <GlassCard variant="card" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Autonomous Progress
            </h4>
            {lifecycleStatus === 'auto_tracking' && (
              <span className="px-1.5 py-0.5 rounded text-2xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                TRACKING
              </span>
            )}
            {lifecycleStatus === 'auto_completed' && (
              <span className="px-1.5 py-0.5 rounded text-2xs font-mono bg-green-500/20 text-green-300 border border-green-500/30">
                READY
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCatchUp}
              disabled={catchingUp}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Scan for missed progress"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${catchingUp ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: duration.dramatic, ease: easing.entrance }}
          />
          {progress >= 90 && (
            <motion.div
              className="absolute inset-y-0 right-0 w-[5%] rounded-r-full"
              style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(34,197,94,0.3) 2px, rgba(34,197,94,0.3) 4px)' }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-400">
            {localData.lastActivity ? `Last activity: ${formatTimeAgo(localData.lastActivity)}` : 'No activity yet'}
          </span>
          <span className="text-sm font-bold text-white">
            {progress}%
          </span>
        </div>
      </GlassCard>

      {/* Auto-Complete Suggestion */}
      <AnimatePresence>
        {localData.shouldAutoComplete && lifecycleStatus === 'auto_completed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-300">
                  This goal appears complete
                </p>
                <p className="text-xs text-green-400/70 mt-1">
                  Based on {totalSignals} signals and {localData.subGoalStats.done}/{localData.subGoalStats.total || 'all'} sub-goals done.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmComplete}
                  disabled={confirming}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 rounded-lg text-green-300 text-xs font-medium transition-all"
                >
                  {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Confirm
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDismissComplete}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-Goals */}
      {localData.subGoals.length > 0 && (
        <GlassCard variant="card" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Sub-Goals
            </h4>
            <span className="text-xs text-slate-400">
              {localData.subGoalStats.done}/{localData.subGoalStats.total}
            </span>
          </div>

          <div className="space-y-2">
            {localData.subGoals.map((sg) => (
              <div
                key={sg.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <button
                  onClick={() => handleSubGoalStatusChange(
                    sg.id,
                    sg.status === 'done' ? 'open' : 'done'
                  )}
                  role="checkbox"
                  aria-checked={sg.status === 'done'}
                  aria-label={sg.title}
                  className="flex-shrink-0"
                >
                  {sg.status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : sg.status === 'in_progress' ? (
                    <Clock className="w-4 h-4 text-blue-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-500 hover:border-blue-400 transition-colors" />
                  )}
                </button>
                <span className={`text-sm flex-1 ${sg.status === 'done' ? 'text-slate-500 line-through' : 'text-white/80'}`}>
                  {sg.title}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Signal Timeline (collapsible) */}
      {totalSignals > 0 && (
        <GlassCard variant="card" className="overflow-hidden">
          <button
            onClick={() => setShowSignals(!showSignals)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Signal Timeline
              </h4>
            </div>
            {showSignals
              ? <ChevronDown className="w-4 h-4 text-slate-400" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
            }
          </button>

          <AnimatePresence>
            {showSignals && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                  {localData.signals.slice(0, 20).map((signal) => {
                    const Icon = SIGNAL_ICONS[signal.signal_type] || Activity;
                    const color = SIGNAL_COLORS[signal.signal_type] || 'text-slate-400';

                    return (
                      <div key={signal.id} className="flex items-start gap-3 py-1.5">
                        <Icon className={`w-3.5 h-3.5 mt-0.5 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 truncate">
                            {signal.source_title || signal.description || signal.signal_type}
                          </p>
                          <p className="text-2xs text-slate-500">
                            {formatTimeAgo(signal.created_at)}
                            {signal.progress_delta > 0 && (
                              <span className="ml-2 text-green-400">+{signal.progress_delta}%</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      )}
    </div>
  );
}

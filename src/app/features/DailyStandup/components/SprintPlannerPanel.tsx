'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Activity, TrendingUp, TrendingDown, Minus, Sun, Sunset, Clock,
  Flame, Loader2, RefreshCw,
} from 'lucide-react';
import type {
  TaskRecommendation,
  VelocityComparison,
} from '@/app/db/models/standup.types';
import type { BurnoutLevel, DaySlot, SprintPlan } from '@/lib/sprint/sprintPlanner';
import { duration } from '@/lib/motion';

interface SprintPlannerPanelProps {
  projectId: string;
  /** Number of sprint days (default 5 = workweek). */
  sprintDays?: number;
}

interface SprintPlanResponse extends SprintPlan {
  sprintDays: number;
  velocityTrend: VelocityComparison['trend'];
  velocityPercentChange: number;
}

// ── Shared visual helpers (mirrored from PredictiveStandup) ──────────────────

function burnoutColor(level: BurnoutLevel): string {
  if (level === 'high') return 'text-red-400';
  if (level === 'medium') return 'text-amber-400';
  return 'text-emerald-400';
}

function burnoutBg(level: BurnoutLevel): string {
  if (level === 'high') return 'bg-red-500/10 border-red-500/30';
  if (level === 'medium') return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
}

function trendIcon(trend: VelocityComparison['trend']) {
  if (trend === 'accelerating') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'decelerating') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function slotIcon(slot: TaskRecommendation['suggestedSlot']) {
  if (slot === 'morning') return <Sun className="w-3 h-3 text-amber-400" />;
  if (slot === 'afternoon') return <Sunset className="w-3 h-3 text-orange-400" />;
  return <Clock className="w-3 h-3 text-slate-400" />;
}

function complexityClass(complexity: TaskRecommendation['estimatedComplexity']) {
  if (complexity === 'light') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (complexity === 'heavy') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Component ───────────────────────────────────────────────────────────────

export default function SprintPlannerPanel({ projectId, sprintDays = 5 }: SprintPlannerPanelProps) {
  const [plan, setPlan] = useState<SprintPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprint/plan?projectId=${encodeURIComponent(projectId)}&sprintDays=${sprintDays}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load sprint plan');
      setPlan(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sprint plan');
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintDays]);

  useEffect(() => {
    if (projectId) fetchPlan();
  }, [projectId, fetchPlan]);

  if (loading && !plan) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Simulating sprint…
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 text-sm gap-2">
        <span>{error ?? 'No sprint plan available'}</span>
        <button onClick={fetchPlan} className="text-xs text-primary/80 hover:text-primary">
          Retry
        </button>
      </div>
    );
  }

  const completionPct = Math.round(plan.simulation.completionProbability * 100);
  const days = plan.days;

  return (
    <div className="flex flex-col h-full">
      {/* Header strip: peak burnout chip + simulation + velocity */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 bg-white/[0.02] gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary/60" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
            Sprint · {plan.sprintDays} days · {plan.taskCount} tasks
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Peak burnout chip */}
          <span className={`flex items-center gap-1 text-2xs font-mono px-2 py-0.5 rounded-full border ${burnoutBg(plan.peakBurnout)} ${burnoutColor(plan.peakBurnout)}`}>
            <Flame className="w-3 h-3" />
            {plan.peakBurnout.toUpperCase()}
          </span>

          {/* Velocity trend */}
          <span className="flex items-center gap-1 text-2xs font-mono text-muted-foreground">
            {trendIcon(plan.velocityTrend)}
            {plan.velocityTrend}
            {plan.velocityPercentChange !== 0 && (
              <span className={plan.velocityPercentChange > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {plan.velocityPercentChange > 0 ? '+' : ''}{Math.round(plan.velocityPercentChange)}%
              </span>
            )}
          </span>

          {/* Refresh */}
          <button onClick={fetchPlan} className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors" title="Re-simulate sprint">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Confidence band */}
      <div className="px-3 py-2 border-b border-white/5 bg-white/[0.015]">
        <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground/70 mb-1">
          <span className="uppercase tracking-wide flex items-center gap-1">
            <Activity className="w-3 h-3" /> Monte Carlo · {plan.simulation.runs} runs
          </span>
          <span className="text-foreground/80">
            {completionPct}% chance of finishing {plan.taskCount} tasks
          </span>
        </div>
        <div className="flex items-center gap-2 text-2xs">
          <span className="text-muted-foreground/60">p10: <span className="text-red-400 font-mono">{plan.simulation.p10}</span></span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/60">p50: <span className="text-amber-400 font-mono">{plan.simulation.p50}</span></span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/60">p90: <span className="text-emerald-400 font-mono">{plan.simulation.p90}</span></span>
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-hidden p-2">
        <div className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          <AnimatePresence>
            {days.map((day, i) => (
              <DayColumn key={day.index} day={day} label={DAY_LABELS[i % 7]} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Day column ───────────────────────────────────────────────────────────────

function DayColumn({ day, label, index }: { day: DaySlot; label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: duration.deliberate }}
      className="flex flex-col rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden min-h-0"
    >
      {/* Day header */}
      <div className="px-2 py-1.5 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
        <span className="text-2xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${burnoutBg(day.burnout)} ${burnoutColor(day.burnout)}`}>
          {day.weight} pts
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
        {day.tasks.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/30 text-center py-4 italic">
            no tasks
          </p>
        ) : (
          day.tasks.map((task, ti) => (
            <motion.div
              key={`${task.title}-${ti}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (index * 0.04) + (ti * 0.02), duration: duration.snappy }}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 hover:bg-white/[0.06] hover:border-white/20 transition-colors"
              title={task.reason}
            >
              <p className="text-xs text-foreground/90 leading-snug line-clamp-2 mb-1">{task.title}</p>
              <div className="flex items-center gap-1.5">
                {slotIcon(task.suggestedSlot)}
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${complexityClass(task.estimatedComplexity)}`}>
                  {task.estimatedComplexity}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

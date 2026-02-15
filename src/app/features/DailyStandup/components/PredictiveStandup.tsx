'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, AlertTriangle, TrendingUp, TrendingDown,
  Clock, Target, Zap, Shield, ChevronDown, ChevronRight,
  Loader2, RefreshCw, Sun, Sunset, Activity, Minus,
} from 'lucide-react';
import type {
  PredictiveStandupData,
  GoalRiskAssessment,
  ContextDecayAlert,
  TaskRecommendation,
  PredictedBlocker,
  VelocityComparison,
} from '@/app/db/models/standup.types';

interface PredictiveStandupProps {
  projectId: string;
}

// ── Color helpers ──

function riskColor(level: string): string {
  if (level === 'high' || level === 'critical') return 'text-red-400';
  if (level === 'medium' || level === 'warning') return 'text-amber-400';
  return 'text-emerald-400';
}

function riskBg(level: string): string {
  if (level === 'high' || level === 'critical') return 'bg-red-500/10 border-red-500/30';
  if (level === 'medium' || level === 'warning') return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
}

function trendIcon(trend: string) {
  if (trend === 'accelerating') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'decelerating' || trend === 'slowing') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function slotIcon(slot: string) {
  if (slot === 'morning') return <Sun className="w-3.5 h-3.5 text-amber-400" />;
  if (slot === 'afternoon') return <Sunset className="w-3.5 h-3.5 text-orange-400" />;
  return <Clock className="w-3.5 h-3.5 text-slate-400" />;
}

function complexityBadge(complexity: string) {
  const colors: Record<string, string> = {
    light: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    heavy: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };
  return colors[complexity] || colors.medium;
}

// ── Main Component ──

export default function PredictiveStandup({ projectId }: PredictiveStandupProps) {
  const [data, setData] = useState<PredictiveStandupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tasks: true,
    risks: false,
    contexts: false,
    blockers: false,
  });

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/standup/predict?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Analyzing project patterns...</span>
      </div>
    );
  }

  if (!data) return null;

  const hasContent = data.goalsAtRisk.length > 0 ||
    data.contextDecayAlerts.length > 0 ||
    data.recommendedTaskOrder.length > 0 ||
    data.predictedBlockers.length > 0;

  if (!hasContent) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 text-center">
        <Radar className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No predictions available yet. Start working on goals to generate insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mission Briefing */}
      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Radar className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                Daily Mission Briefing
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchPredictions}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.button>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{data.missionBriefing}</p>
          </div>
        </div>
      </div>

      {/* Velocity Comparison */}
      <VelocityBar velocity={data.velocityComparison} />

      {/* Recommended Tasks */}
      {data.recommendedTaskOrder.length > 0 && (
        <CollapsibleSection
          title="Recommended Task Order"
          icon={<Target className="w-4 h-4 text-blue-400" />}
          badge={`${data.recommendedTaskOrder.length}`}
          badgeColor="bg-blue-500/20 text-blue-300 border-blue-500/30"
          expanded={expandedSections.tasks}
          onToggle={() => toggleSection('tasks')}
        >
          <div className="space-y-2">
            {data.recommendedTaskOrder.map((task, idx) => (
              <TaskCard key={idx} task={task} index={idx} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Predicted Blockers */}
      {data.predictedBlockers.length > 0 && (
        <CollapsibleSection
          title="Predicted Blockers"
          icon={<Shield className="w-4 h-4 text-red-400" />}
          badge={`${data.predictedBlockers.length}`}
          badgeColor="bg-red-500/20 text-red-300 border-red-500/30"
          expanded={expandedSections.blockers}
          onToggle={() => toggleSection('blockers')}
        >
          <div className="space-y-2">
            {data.predictedBlockers.map((blocker, idx) => (
              <BlockerCard key={idx} blocker={blocker} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Goals at Risk */}
      {data.goalsAtRisk.filter(g => g.riskLevel !== 'low').length > 0 && (
        <CollapsibleSection
          title="Goals at Risk"
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          badge={`${data.goalsAtRisk.filter(g => g.riskLevel !== 'low').length}`}
          badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/30"
          expanded={expandedSections.risks}
          onToggle={() => toggleSection('risks')}
        >
          <div className="space-y-2">
            {data.goalsAtRisk.filter(g => g.riskLevel !== 'low').map(goal => (
              <GoalRiskCard key={goal.goalId} goal={goal} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Context Decay Alerts */}
      {data.contextDecayAlerts.length > 0 && (
        <CollapsibleSection
          title="Context Health"
          icon={<Activity className="w-4 h-4 text-purple-400" />}
          badge={`${data.contextDecayAlerts.length}`}
          badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/30"
          expanded={expandedSections.contexts}
          onToggle={() => toggleSection('contexts')}
        >
          <div className="space-y-2">
            {data.contextDecayAlerts.map(alert => (
              <ContextAlertCard key={alert.contextId} alert={alert} />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ── Sub-components ──

function VelocityBar({ velocity }: { velocity: VelocityComparison }) {
  const { currentPeriod, trend, percentChange } = velocity;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Velocity</span>
        </div>
        <div className="flex items-center gap-2">
          {trendIcon(trend)}
          <span className={'text-sm font-bold ' + (
            trend === 'accelerating' ? 'text-emerald-400' :
            trend === 'decelerating' ? 'text-red-400' : 'text-slate-300'
          )}>
            {percentChange > 0 ? '+' : ''}{percentChange}%
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <MetricPill
          label="Impl/day"
          value={currentPeriod.implementationsPerDay.toString()}
        />
        <MetricPill
          label="Success"
          value={`${currentPeriod.successRate}%`}
        />
        <MetricPill
          label="Avg task"
          value={currentPeriod.avgTaskDurationMinutes > 0
            ? `${currentPeriod.avgTaskDurationMinutes}m`
            : 'N/A'
          }
        />
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  badge,
  badgeColor,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</h4>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeColor}`}>
            {badge}
          </span>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronRight className="w-4 h-4 text-slate-400" />
        }
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, index }: { task: TaskRecommendation; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
        <span className="text-xs font-bold text-blue-300">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90">{task.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{task.reason}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="flex items-center gap-1">
            {slotIcon(task.suggestedSlot)}
            <span className="text-[10px] text-slate-500 capitalize">{task.suggestedSlot}</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${complexityBadge(task.estimatedComplexity)}`}>
            {task.estimatedComplexity}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function BlockerCard({ blocker }: { blocker: PredictedBlocker }) {
  return (
    <div className={`p-3 rounded-lg border ${riskBg(blocker.severity)}`}>
      <div className="flex items-start gap-2">
        <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${riskColor(blocker.severity)}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white/90">{blocker.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{blocker.description}</p>
          <p className="text-xs text-cyan-400/80 mt-1">
            Action: {blocker.preventiveAction}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 inline-block">
            {blocker.confidence}% confidence
          </span>
        </div>
      </div>
    </div>
  );
}

function GoalRiskCard({ goal }: { goal: GoalRiskAssessment }) {
  return (
    <div className={`p-3 rounded-lg border ${riskBg(goal.riskLevel)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {trendIcon(goal.velocityTrend)}
            <p className="text-sm font-medium text-white/90 truncate">{goal.goalTitle}</p>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{goal.riskReason}</p>
          <p className="text-xs text-cyan-400/80 mt-1">{goal.suggestedAction}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
          <span className={`text-sm font-bold ${riskColor(goal.riskLevel)}`}>
            {goal.progress}%
          </span>
          <span className="text-[10px] text-slate-500">
            {goal.daysSinceActivity}d ago
          </span>
        </div>
      </div>
    </div>
  );
}

function ContextAlertCard({ alert }: { alert: ContextDecayAlert }) {
  return (
    <div className={`p-3 rounded-lg border ${riskBg(alert.urgency)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90">{alert.contextName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{alert.suggestion}</p>
          {alert.linkedToActiveGoals && (
            <span className="text-[10px] text-amber-400 mt-1 inline-block">
              Linked to active goals
            </span>
          )}
        </div>
        <div className="flex-shrink-0 ml-3">
          <div className="w-10 h-10 rounded-full relative">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="rgba(148,163,184,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={alert.urgency === 'critical' ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.6)'}
                strokeWidth="3"
                strokeDasharray={`${alert.decayPercent} ${100 - alert.decayPercent}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {alert.decayPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

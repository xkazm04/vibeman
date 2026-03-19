'use client';

/**
 * ConductorCompactCard — Thin compact card representing a single conductor run.
 * Designed to fit 4 across page width (~25% each).
 *
 * Shows: goal name, mini stage flow, status badge, key metrics, and action button.
 * Clicking navigates back to the Conductor module for full debug view.
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Loader2,
  MessageCircleQuestion,
  ExternalLink,
  Zap,
  Brain,
  Sparkles,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import type { ConductorRunSummary } from '../hooks/useConductorSync';

// V3 stages and V2 stages for the mini flow
const V3_STAGES = ['plan', 'dispatch', 'reflect'] as const;
const V2_STAGES = ['scout', 'triage', 'batch', 'execute', 'review'] as const;

const STAGE_ICONS: Record<string, React.ElementType> = {
  plan: Brain,
  dispatch: Zap,
  reflect: Sparkles,
  scout: Search,
  triage: Filter,
  batch: Layers,
  execute: Zap,
  review: CheckCircle,
};

const STAGE_COLORS: Record<string, string> = {
  plan: 'text-cyan-400',
  dispatch: 'text-purple-400',
  reflect: 'text-pink-400',
  scout: 'text-cyan-400',
  triage: 'text-amber-400',
  batch: 'text-purple-400',
  execute: 'text-orange-400',
  review: 'text-pink-400',
};

function getStatusConfig(status: string) {
  switch (status) {
    case 'running':
      return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', label: 'Running', spin: true };
    case 'paused':
      return { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', label: 'Paused', spin: false };
    case 'queued':
      return { icon: Play, color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', label: 'Queued', spin: false };
    case 'stopping':
      return { icon: Loader2, color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', label: 'Stopping', spin: true };
    default:
      return { icon: Play, color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-600/30', label: status, spin: false };
  }
}

interface ConductorCompactCardProps {
  run: ConductorRunSummary;
}

export const ConductorCompactCard = memo(function ConductorCompactCard({ run }: ConductorCompactCardProps) {
  const setActiveModule = useOnboardingStore((s) => s.setActiveModule);
  const statusCfg = getStatusConfig(run.status);
  const StatusIcon = statusCfg.icon;

  const stages = run.pipelineVersion === 3 ? V3_STAGES : V2_STAGES;
  const currentIdx = stages.indexOf(run.currentStage as never);

  const hasQA = run.hasIntentQuestions || run.hasTriageCheckpoint;

  const navigateToConductor = useCallback(() => {
    setActiveModule('conductor');
  }, [setActiveModule]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative flex flex-col gap-2 p-3 rounded-lg border ${statusCfg.border} ${statusCfg.bg} backdrop-blur-sm min-w-0`}
    >
      {/* Header: goal title + status */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-medium text-gray-200 truncate flex-1" title={run.goalTitle}>
          {run.goalTitle}
        </span>
        <span className={`flex items-center gap-1 text-2xs font-medium ${statusCfg.color} shrink-0`}>
          <StatusIcon className={`w-3 h-3 ${statusCfg.spin ? 'animate-spin' : ''}`} />
          {statusCfg.label}
        </span>
      </div>

      {/* Mini stage flow */}
      <div className="flex items-center gap-0.5">
        {stages.map((stage, idx) => {
          const Icon = STAGE_ICONS[stage] || Zap;
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          const color = isActive
            ? STAGE_COLORS[stage]
            : isDone
              ? 'text-emerald-400'
              : 'text-gray-600';
          const bg = isActive
            ? 'bg-white/10'
            : isDone
              ? 'bg-emerald-500/10'
              : 'bg-gray-800/30';

          return (
            <div key={stage} className="flex items-center gap-0.5 flex-1 min-w-0">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded ${bg} transition-colors`}
                title={stage}
              >
                <Icon className={`w-2.5 h-2.5 ${color}`} />
              </div>
              {idx < stages.length - 1 && (
                <div className={`flex-1 h-px ${isDone ? 'bg-emerald-500/40' : 'bg-gray-700/40'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Metrics row */}
      <div className="flex items-center justify-between text-2xs text-gray-500 tabular-nums">
        <span>
          Cycle {run.cycle} | {run.tasksCompleted}/{run.tasksTotal} tasks
        </span>
        {run.estimatedCost > 0 && (
          <span>${run.estimatedCost.toFixed(2)}</span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1.5">
        {hasQA && (
          <button
            onClick={navigateToConductor}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-2xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-all active:scale-95"
          >
            <MessageCircleQuestion className="w-3 h-3" />
            Answer {run.intentQuestionCount + run.triageItemCount} Q
          </button>
        )}
        <button
          onClick={navigateToConductor}
          className={`${hasQA ? '' : 'flex-1'} flex items-center justify-center gap-1 px-2 py-1 rounded text-2xs font-medium text-gray-400 hover:text-gray-300 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/40 transition-all active:scale-95`}
          title="Open in Conductor"
        >
          <ExternalLink className="w-3 h-3" />
          {!hasQA && 'View'}
        </button>
      </div>
    </motion.div>
  );
});

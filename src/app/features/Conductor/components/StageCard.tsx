/**
 * StageCard — Individual pipeline stage visualization
 *
 * Displays a single pipeline stage with status, progress, and item counts.
 * Pulses with theme glow when active, shows checkmark when completed.
 */

'use client';

import { motion } from 'framer-motion';
import {
  Search, Filter, Layers, Zap, CheckCircle, Brain, Sparkles,
  Loader2, AlertCircle, Pause, Clock,
} from 'lucide-react';
import type { AnyPipelineStage, StageState, ExecutionTaskState } from '../lib/types';

const STAGE_ICONS: Record<string, typeof Search> = {
  scout: Search,
  triage: Filter,
  batch: Layers,
  execute: Zap,
  review: CheckCircle,
  // v3 stages
  plan: Brain,
  dispatch: Zap,
  reflect: Sparkles,
};

const STAGE_COLORS: Record<string, { active: string; glow: string; bg: string }> = {
  scout: { active: 'text-cyan-400', glow: 'shadow-cyan-500/40', bg: 'bg-cyan-500/10' },
  triage: { active: 'text-amber-400', glow: 'shadow-amber-500/40', bg: 'bg-amber-500/10' },
  batch: { active: 'text-purple-400', glow: 'shadow-purple-500/40', bg: 'bg-purple-500/10' },
  execute: { active: 'text-orange-400', glow: 'shadow-orange-500/40', bg: 'bg-orange-500/10' },
  review: { active: 'text-pink-400', glow: 'shadow-pink-500/40', bg: 'bg-pink-500/10' },
  // v3 stages
  plan: { active: 'text-cyan-400', glow: 'shadow-cyan-500/40', bg: 'bg-cyan-500/10' },
  dispatch: { active: 'text-purple-400', glow: 'shadow-purple-500/40', bg: 'bg-purple-500/10' },
  reflect: { active: 'text-pink-400', glow: 'shadow-pink-500/40', bg: 'bg-pink-500/10' },
};

const STAGE_LABELS: Record<string, string> = {
  scout: 'Scout',
  triage: 'Triage',
  batch: 'Batch',
  execute: 'Execute',
  review: 'Review',
  // v3 stages
  plan: 'Plan',
  dispatch: 'Dispatch',
  reflect: 'Reflect',
};

interface StageCardProps {
  stage: AnyPipelineStage;
  state: StageState;
  isCurrentStage: boolean;
  onClick?: () => void;
}

export default function StageCard({ stage, state, isCurrentStage, onClick }: StageCardProps) {
  const Icon = STAGE_ICONS[stage] || Zap;
  const colors = STAGE_COLORS[stage] || STAGE_COLORS.execute;
  const label = STAGE_LABELS[stage] || stage;

  const isActive = state.status === 'running';
  const isCompleted = state.status === 'completed';
  const isFailed = state.status === 'failed';
  const isSkipped = state.status === 'skipped';
  const isPending = state.status === 'pending';

  // Extract per-task execution data for execute stage
  const executionTasks: ExecutionTaskState[] =
    stage === 'execute' && Array.isArray(state.details?.executionTasks)
      ? (state.details.executionTasks as ExecutionTaskState[])
      : [];

  // Extract per-task data for v3 dispatch stage
  const dispatchTasks: Array<{ id: string; title: string; status: string; provider?: string }> =
    stage === 'dispatch' && Array.isArray(state.details?.tasks)
      ? (state.details.tasks as Array<{ id: string; title: string; status: string; provider?: string }>)
      : [];

  return (
    <motion.button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all min-w-[100px]
        ${isActive
          ? `border-gray-600 ${colors.bg} shadow-lg ${colors.glow}`
          : isCompleted
            ? 'border-emerald-700/50 bg-emerald-900/10'
            : isFailed
              ? 'border-red-700/50 bg-red-900/10'
              : 'border-gray-800 bg-gray-900/30 hover:bg-gray-800/50'
        }
      `}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      data-testid={`stage-card-${stage}`}
    >
      {/* Pulse ring for active stage */}
      {isActive && (
        <motion.div
          className={`absolute inset-0 rounded-xl border ${colors.active.replace('text-', 'border-')}`}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center
        ${isActive ? colors.bg : isCompleted ? 'bg-emerald-500/10' : isFailed ? 'bg-red-500/10' : 'bg-gray-800'}
      `}>
        {isActive ? (
          <Loader2 className={`w-5 h-5 ${colors.active} animate-spin`} />
        ) : isCompleted ? (
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        ) : isFailed ? (
          <AlertCircle className="w-5 h-5 text-red-400" />
        ) : isSkipped ? (
          <Pause className="w-5 h-5 text-gray-500" />
        ) : (
          <Icon className={`w-5 h-5 ${isCurrentStage ? colors.active : 'text-gray-500'}`} />
        )}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium
        ${isActive ? colors.active : isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-gray-400'}
      `}>
        {label}
      </span>

      {/* Item counts */}
      {(state.itemsIn > 0 || state.itemsOut > 0) && (
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="text-gray-500">{state.itemsIn}</span>
          <span className="text-gray-600">&rarr;</span>
          <span className={isCompleted ? 'text-emerald-400' : colors.active}>
            {state.itemsOut}
          </span>
        </div>
      )}

      {/* Per-task execution details (execute stage only) */}
      {stage === 'execute' && executionTasks.length > 0 && (
        <div className="w-full space-y-0.5 mt-1">
          {executionTasks.slice(0, 4).map((task) => (
            <div key={task.requirementName} className="flex items-center gap-1 text-[9px] font-mono">
              <span className={
                task.status === 'running' ? 'text-cyan-400' :
                task.status === 'completed' ? 'text-emerald-400' :
                task.status === 'failed' || task.status === 'aborted' ? 'text-red-400' :
                'text-gray-600'
              }>
                {task.status === 'running' ? '\u25CF' :
                 task.status === 'completed' ? '\u2713' :
                 task.status === 'failed' || task.status === 'aborted' ? '\u2717' : '\u25CB'}
              </span>
              <span className="text-gray-400 truncate max-w-[60px]">
                {task.requirementName.replace(/^conductor-/, '').slice(0, 12)}
              </span>
              <span className="text-gray-600 ml-auto">{task.provider.slice(0, 3)}</span>
            </div>
          ))}
          {executionTasks.length > 4 && (
            <span className="text-[8px] text-gray-600">+{executionTasks.length - 4} more</span>
          )}
        </div>
      )}

      {/* Per-task dispatch details (v3 dispatch stage) */}
      {stage === 'dispatch' && dispatchTasks.length > 0 && (
        <div className="w-full space-y-0.5 mt-1">
          {dispatchTasks.slice(0, 4).map((task) => (
            <div key={task.id} className="flex items-center gap-1 text-[9px] font-mono">
              <span className={
                task.status === 'running' ? 'text-cyan-400' :
                task.status === 'completed' ? 'text-emerald-400' :
                task.status === 'failed' ? 'text-red-400' :
                'text-gray-600'
              }>
                {task.status === 'running' ? '\u25CF' :
                 task.status === 'completed' ? '\u2713' :
                 task.status === 'failed' ? '\u2717' : '\u25CB'}
              </span>
              <span className="text-gray-400 truncate max-w-[60px]">
                {task.title.slice(0, 14)}
              </span>
              {task.provider && (
                <span className="text-gray-600 ml-auto">{task.provider.slice(0, 3)}</span>
              )}
            </div>
          ))}
          {dispatchTasks.length > 4 && (
            <span className="text-[8px] text-gray-600">+{dispatchTasks.length - 4} more</span>
          )}
        </div>
      )}

      {/* Pending indicator */}
      {isPending && !isCurrentStage && (
        <Clock className="w-3 h-3 text-gray-600 absolute top-2 right-2" />
      )}
    </motion.button>
  );
}

/**
 * StageCard — Individual pipeline stage visualization
 *
 * Displays a single pipeline stage with status, progress, and item counts.
 * Pulses with theme glow when active, shows checkmark when completed.
 */

'use client';

import { motion } from 'framer-motion';
import { hover as hoverPresets, tap, pulse } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useThemeStore } from '@/stores/themeStore';
import type { AnyPipelineStage, StageState, ExecutionTaskState } from '../lib/types';
import { getStageTheme } from '../lib/stageTheme';
import { STAGE_ICONS, ExecuteIcon, CompletedIcon, FailedIcon, SkippedIcon, PendingIcon } from './StageIcons';
import StageLoadingAnimation from './StageLoadingAnimations';

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
  const prefersReduced = useReducedMotion();
  const appTheme = useThemeStore((s) => s.theme);
  const Icon = STAGE_ICONS[stage] || ExecuteIcon;
  const theme = getStageTheme(stage, appTheme);
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
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all min-w-full sm:min-w-[100px] sm:w-auto overflow-hidden
        ${isActive
          ? `border-gray-600 ${theme.bg} shadow-lg ${theme.glow}`
          : isCompleted
            ? 'border-emerald-700/50 bg-emerald-900/10'
            : isFailed
              ? 'border-red-700/50 bg-red-900/10'
              : 'border-gray-800 bg-gray-900/30 hover:bg-gray-800/50'
        }
      `}
      whileHover={!prefersReduced ? hoverPresets.card : undefined}
      whileTap={!prefersReduced ? tap.press : undefined}
      data-testid={`stage-card-${stage}`}
    >
      {/* Pulse ring for active stage */}
      {isActive && !prefersReduced && (
        <motion.div
          className={`absolute inset-0 rounded-xl border ${theme.text.replace('text-', 'border-')}`}
          animate={pulse.ring.animate}
          transition={pulse.ring.transition}
        />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center
        ${isActive ? theme.bg : isCompleted ? 'bg-emerald-500/10' : isFailed ? 'bg-red-500/10' : 'bg-gray-800'}
      `}>
        {isActive ? (
          <StageLoadingAnimation stage={stage} className={`w-5 h-5 ${theme.text}`} reduced={prefersReduced} />
        ) : isCompleted ? (
          <CompletedIcon className="w-5 h-5 text-emerald-400" />
        ) : isFailed ? (
          <FailedIcon className="w-5 h-5 text-red-400" />
        ) : isSkipped ? (
          <SkippedIcon className="w-5 h-5 text-gray-500" />
        ) : (
          <Icon className={`w-5 h-5 ${isCurrentStage ? theme.text : 'text-gray-500'}`} />
        )}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium
        ${isActive ? theme.text : isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-gray-400'}
      `}>
        {label}
      </span>

      {/* Item counts */}
      {(state.itemsIn > 0 || state.itemsOut > 0) && (
        <div className="flex items-center gap-1 text-2xs font-mono">
          <span className="text-gray-500">{state.itemsIn}</span>
          <span className="text-gray-600">&rarr;</span>
          <span className={isCompleted ? 'text-emerald-400' : theme.text}>
            {state.itemsOut}
          </span>
        </div>
      )}

      {/* Per-task execution details (execute stage only) */}
      {stage === 'execute' && executionTasks.length > 0 && (
        <div className="w-full space-y-0.5 mt-1">
          {executionTasks.slice(0, 4).map((task) => (
            <div key={task.requirementName} className="flex items-center gap-1 text-micro font-mono">
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
            <div key={task.id} className="flex items-center gap-1 text-micro font-mono">
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
        <PendingIcon className="w-3 h-3 text-gray-600 absolute top-2 right-2" />
      )}

      {/* Progress fill indicator (active stage only) */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-800/50">
          <div
            className={`h-full ${theme.progressBar} transition-all duration-700`}
            style={{
              width: `${state.itemsIn > 0
                ? Math.min(Math.round((state.itemsOut / state.itemsIn) * 100), 100)
                : typeof state.details?.percentage === 'number'
                  ? Math.min(Math.round(state.details.percentage as number), 100)
                  : 5}%`,
            }}
          />
        </div>
      )}
    </motion.button>
  );
}

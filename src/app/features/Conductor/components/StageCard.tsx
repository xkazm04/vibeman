/**
 * StageCard — Individual pipeline stage visualization
 *
 * Displays a single pipeline stage with status, progress, and item counts.
 * Pulses with theme glow when active, shows checkmark when completed.
 */

'use client';

import { motion } from 'framer-motion';
import {
  Loader2, AlertCircle, Pause, Clock, CheckCircle,
} from 'lucide-react';
import { hover as hoverPresets, tap, pulse } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { AnyPipelineStage, StageState, ExecutionTaskState } from '../lib/types';

// Custom SVG stage icons with circuit-neural visual language
function ScoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16.5 16.5 21 21" />
      {/* Circuit trace accents */}
      <path d="M11 5V2" strokeWidth="1" opacity="0.5" />
      <path d="M17 11h3" strokeWidth="1" opacity="0.5" />
      <circle cx="11" cy="11" r="2" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

function TriageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Routing/sorting node */}
      <path d="M12 3v6" />
      <path d="M12 9 6 18" />
      <path d="M12 9l6 9" />
      <circle cx="12" cy="9" r="2" />
      <circle cx="6" cy="18" r="2" strokeWidth="1" />
      <circle cx="18" cy="18" r="2" strokeWidth="1" />
      {/* Circuit traces */}
      <path d="M12 3h3" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function BatchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Bundled parallel tasks */}
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
      {/* Circuit connections */}
      <path d="M10 7.5h4" strokeWidth="1" opacity="0.5" />
      <path d="M10 16.5h4" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function ExecuteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Precision execution bolt with circuit */}
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      {/* Circuit trace */}
      <path d="M18 6h3" strokeWidth="1" opacity="0.4" />
      <path d="M3 18h3" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Analysis eye with circuit */}
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {/* Circuit traces */}
      <path d="M12 5V2" strokeWidth="1" opacity="0.4" />
      <path d="M12 22v-3" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Brain-like neural planning */}
      <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6l4 5 4-5c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
      <path d="M9 10h6" strokeWidth="1" />
      <path d="M12 7v6" strokeWidth="1" />
      {/* Circuit traces */}
      <path d="M8 5 5 3" strokeWidth="1" opacity="0.4" />
      <path d="M16 5l3-2" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function DispatchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Signal routing/dispatch */}
      <circle cx="5" cy="12" r="2" />
      <path d="M7 12h4" />
      <path d="M11 12l5-5h5" />
      <path d="M11 12h10" />
      <path d="M11 12l5 5h5" />
      {/* Arrow heads */}
      <path d="M19 5l2 2-2 2" strokeWidth="1.2" />
      <path d="M19 10l2 2-2 2" strokeWidth="1.2" />
      <path d="M19 15l2 2-2 2" strokeWidth="1.2" />
    </svg>
  );
}

function ReflectIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Reflective loop/mirror */}
      <path d="M12 3v18" strokeDasharray="2 2" opacity="0.4" />
      <path d="M7 8l-3 4 3 4" />
      <path d="M17 8l3 4-3 4" />
      <circle cx="12" cy="12" r="3" />
      {/* Circuit sparkle */}
      <path d="M12 6l1-1" strokeWidth="1" opacity="0.5" />
      <path d="M12 18l-1 1" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

type SvgIconComponent = ({ className }: { className?: string }) => React.JSX.Element;

const STAGE_ICONS: Record<string, SvgIconComponent> = {
  scout: ScoutIcon,
  triage: TriageIcon,
  batch: BatchIcon,
  execute: ExecuteIcon,
  review: ReviewIcon,
  // v3 stages
  plan: PlanIcon,
  dispatch: DispatchIcon,
  reflect: ReflectIcon,
};

const STAGE_COLORS: Record<string, { active: string; glow: string; bg: string; progressBar: string }> = {
  scout: { active: 'text-cyan-400', glow: 'shadow-cyan-500/40', bg: 'bg-cyan-500/10', progressBar: 'bg-cyan-400' },
  triage: { active: 'text-amber-400', glow: 'shadow-amber-500/40', bg: 'bg-amber-500/10', progressBar: 'bg-amber-400' },
  batch: { active: 'text-purple-400', glow: 'shadow-purple-500/40', bg: 'bg-purple-500/10', progressBar: 'bg-purple-400' },
  execute: { active: 'text-orange-400', glow: 'shadow-orange-500/40', bg: 'bg-orange-500/10', progressBar: 'bg-orange-400' },
  review: { active: 'text-pink-400', glow: 'shadow-pink-500/40', bg: 'bg-pink-500/10', progressBar: 'bg-pink-400' },
  // v3 stages
  plan: { active: 'text-cyan-400', glow: 'shadow-cyan-500/40', bg: 'bg-cyan-500/10', progressBar: 'bg-cyan-400' },
  dispatch: { active: 'text-purple-400', glow: 'shadow-purple-500/40', bg: 'bg-purple-500/10', progressBar: 'bg-purple-400' },
  reflect: { active: 'text-pink-400', glow: 'shadow-pink-500/40', bg: 'bg-pink-500/10', progressBar: 'bg-pink-400' },
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
  const prefersReduced = useReducedMotion();
  const Icon = STAGE_ICONS[stage] || ExecuteIcon;
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
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all min-w-[100px] overflow-hidden
        ${isActive
          ? `border-gray-600 ${colors.bg} shadow-lg ${colors.glow}`
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
          className={`absolute inset-0 rounded-xl border ${colors.active.replace('text-', 'border-')}`}
          animate={pulse.ring.animate}
          transition={pulse.ring.transition}
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
        <div className="flex items-center gap-1 text-2xs font-mono">
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
        <Clock className="w-3 h-3 text-gray-600 absolute top-2 right-2" />
      )}

      {/* Progress fill indicator (active stage only) */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-800/50">
          <div
            className={`h-full ${colors.progressBar} transition-all duration-700`}
            style={{
              width: `${state.itemsIn > 0 ? Math.min(Math.round((state.itemsOut / state.itemsIn) * 100), 100) : 5}%`,
            }}
          />
        </div>
      )}
    </motion.button>
  );
}

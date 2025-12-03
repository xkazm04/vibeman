'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileCode,
  Cog,
  Zap
} from 'lucide-react';
import {
  useBlueprintExecutionStore,
  useIsDecisionPending,
  usePendingDecision,
  formatDecisionSummary,
  isTechnicalSummary,
} from '@/stores/blueprintExecutionStore';

/**
 * Compact Blueprint Progress Component
 *
 * Displays in GlobalTaskBar header when a blueprint is running.
 * Shows:
 * - Current stage and progress
 * - Decision prompt with Accept/Reject buttons
 * - Quick actions without leaving current page
 */
export default function BlueprintProgress() {
  const currentExecution = useBlueprintExecutionStore(state => state.currentExecution);
  const resumeExecution = useBlueprintExecutionStore(state => state.resumeExecution);
  const abortExecution = useBlueprintExecutionStore(state => state.abortExecution);
  const getProgress = useBlueprintExecutionStore(state => state.getProgress);

  const isDecisionPending = useIsDecisionPending();
  const pendingDecision = usePendingDecision();

  // Don't render if no execution
  if (!currentExecution) {
    return null;
  }

  const progress = getProgress();
  const currentStage = currentExecution.stages[currentExecution.currentStageIndex];

  // Get stage icon
  const getStageIcon = (type: string) => {
    switch (type) {
      case 'analyzer':
        return FileCode;
      case 'processor':
        return Cog;
      case 'executor':
        return Zap;
      default:
        return ChevronRight;
    }
  };

  const StageIcon = currentStage ? getStageIcon(currentStage.type) : ChevronRight;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 border-b border-violet-500/20">
      {/* Blueprint indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            {isDecisionPending ? (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            ) : currentExecution.status === 'running' ? (
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            ) : (
              <Play className="w-4 h-4 text-violet-400" />
            )}
          </div>
          {/* Status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
            isDecisionPending ? 'bg-amber-400 animate-pulse' :
            currentExecution.status === 'running' ? 'bg-green-400' :
            currentExecution.status === 'completed' ? 'bg-green-400' :
            currentExecution.status === 'failed' ? 'bg-red-400' :
            'bg-gray-400'
          }`} />
        </div>

        {/* Blueprint name and stage */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-violet-300 truncate max-w-32">
            {currentExecution.blueprintName}
          </span>
          {currentStage && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <StageIcon className="w-3 h-3" />
              <span className="truncate max-w-24">{currentStage.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 max-w-32">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5 text-center">
          {progress.completed}/{progress.total}
        </div>
      </div>

      {/* Decision prompt (when pending) */}
      <AnimatePresence>
        {isDecisionPending && pendingDecision && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg"
          >
            {/* Summary */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-amber-300 truncate max-w-40">
                {pendingDecision.title}
              </span>
              <span className="text-[10px] text-gray-400">
                {isTechnicalSummary(pendingDecision.summary)
                  ? `${pendingDecision.summary.filesScanned} files, ${pendingDecision.summary.issuesFound || 0} issues`
                  : pendingDecision.summary.contextName
                }
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => abortExecution('Rejected by user')}
                className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-colors"
                title="Reject"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => resumeExecution()}
                className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 transition-colors"
                title="Accept"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicator when not pending */}
      {!isDecisionPending && (
        <div className={`text-xs px-2 py-1 rounded ${
          currentExecution.status === 'running' ? 'bg-cyan-500/10 text-cyan-400' :
          currentExecution.status === 'completed' ? 'bg-green-500/10 text-green-400' :
          currentExecution.status === 'failed' ? 'bg-red-500/10 text-red-400' :
          currentExecution.status === 'aborted' ? 'bg-gray-500/10 text-gray-400' :
          'bg-gray-500/10 text-gray-400'
        }`}>
          {currentExecution.status === 'running' ? 'Running' :
           currentExecution.status === 'completed' ? 'Done' :
           currentExecution.status === 'failed' ? 'Failed' :
           currentExecution.status === 'aborted' ? 'Aborted' :
           currentExecution.status}
        </div>
      )}
    </div>
  );
}

/**
 * Expanded Blueprint Progress Panel
 *
 * For use in Blueprint page or modal view.
 * Shows full stage list and detailed decision info.
 */
export function BlueprintProgressExpanded() {
  const currentExecution = useBlueprintExecutionStore(state => state.currentExecution);
  const resumeExecution = useBlueprintExecutionStore(state => state.resumeExecution);
  const abortExecution = useBlueprintExecutionStore(state => state.abortExecution);

  const isDecisionPending = useIsDecisionPending();
  const pendingDecision = usePendingDecision();

  if (!currentExecution) {
    return (
      <div className="text-center text-gray-500 py-8">
        No blueprint running
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">
            {currentExecution.blueprintName}
          </h3>
          <p className="text-sm text-gray-500">
            {currentExecution.status === 'running' ? 'Running...' :
             currentExecution.status === 'paused-for-decision' ? 'Awaiting decision' :
             currentExecution.status}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
          isDecisionPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          currentExecution.status === 'running' ? 'bg-cyan-500/20 text-cyan-400' :
          currentExecution.status === 'completed' ? 'bg-green-500/20 text-green-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {isDecisionPending ? 'Decision Required' : currentExecution.status}
        </div>
      </div>

      {/* Stages list */}
      <div className="space-y-2">
        {currentExecution.stages.map((stage, index) => {
          const isCurrent = index === currentExecution.currentStageIndex;
          const Icon = stage.type === 'analyzer' ? FileCode :
                       stage.type === 'processor' ? Cog :
                       stage.type === 'executor' ? Zap : ChevronRight;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCurrent
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : stage.status === 'completed'
                  ? 'bg-green-500/5 border-green-500/20'
                  : stage.status === 'failed'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-gray-800/30 border-gray-700/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isCurrent
                  ? 'bg-violet-500/20 text-violet-400'
                  : stage.status === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : stage.status === 'failed'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}>
                {stage.status === 'running' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : stage.status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : stage.status === 'failed' ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-300">
                  {stage.name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {stage.type}
                </div>
              </div>

              <div className="text-xs text-gray-500">
                {stage.status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision panel */}
      {isDecisionPending && pendingDecision && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-amber-300">
              {pendingDecision.title}
            </h4>
            {pendingDecision.description && (
              <p className="text-sm text-gray-400 mt-1">
                {pendingDecision.description}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {formatDecisionSummary(pendingDecision.summary)}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => abortExecution('Rejected by user')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => resumeExecution()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 transition-colors"
            >
              <Check className="w-4 h-4" />
              Accept & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

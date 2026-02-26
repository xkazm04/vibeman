'use client';

import {
  Play,
  Loader2,
  AlertTriangle,
  StopCircle,
} from 'lucide-react';

interface ReflectionActionsProps {
  isRunning: boolean;
  isTriggering: boolean;
  shouldTrigger: boolean;
  scope: 'project' | 'global';
  progress: number;
  decisionsSinceReflection: number;
  nextThreshold: number;
  triggerReason: string | null;
  onTrigger: () => void;
  onCancel: () => void;
}

export function ReflectionActions({
  isRunning,
  isTriggering,
  shouldTrigger,
  scope,
  progress,
  decisionsSinceReflection,
  nextThreshold,
  triggerReason,
  onTrigger,
  onCancel,
}: ReflectionActionsProps) {
  return (
    <>
      {/* Progress to Next Trigger (hidden when running, project mode only) */}
      {!isRunning && scope === 'project' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">Decisions until next reflection</span>
            <span className="text-xs text-zinc-400">
              {decisionsSinceReflection} / {nextThreshold}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Trigger Reason (project mode only) */}
      {shouldTrigger && !isRunning && scope === 'project' && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-4">
          <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-300">{triggerReason}</span>
        </div>
      )}

      {/* Action Buttons */}
      {isRunning ? (
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
        >
          <StopCircle className="w-4 h-4" />
          Cancel Reflection
        </button>
      ) : (
        <button
          onClick={onTrigger}
          disabled={isTriggering}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none ${
            isTriggering
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : shouldTrigger
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {isTriggering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {scope === 'global' ? 'Trigger Global Reflection' : 'Trigger Reflection'}
            </>
          )}
        </button>
      )}

      {/* Info Text */}
      <p className="text-xs text-zinc-600 mt-3 text-center">
        {scope === 'global'
          ? 'Global reflection analyzes patterns across all projects and identifies cross-project meta-patterns.'
          : 'Reflection analyzes your direction decisions and updates brain-guide.md with learned patterns.'}
      </p>
    </>
  );
}

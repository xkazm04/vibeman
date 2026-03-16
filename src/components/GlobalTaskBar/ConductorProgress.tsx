/**
 * ConductorProgress — Compact conductor pipeline status for GlobalTaskBar
 *
 * Renders inside GlobalTaskBar, survives all SPA navigation. Polls pipeline
 * status via useConductorStatus hook and shows stage progress, metrics,
 * and pause/stop controls. Also handles crash recovery via useConductorRecovery.
 */

'use client';

import { Sparkles, Pause, Square, Play, Loader2, AlertTriangle, X } from 'lucide-react';
import { useConductorStore } from '@/app/features/Conductor/lib/conductorStore';
import { useConductorStatus } from '@/app/features/Conductor/lib/useConductorStatus';
import { useConductorRecovery } from '@/app/features/Conductor/lib/useConductorRecovery';
import { PIPELINE_STAGES } from '@/app/features/Conductor/lib/types';
import type { StageState } from '@/app/features/Conductor/lib/types';

function stageShort(state: StageState): string {
  switch (state.status) {
    case 'completed': return 'done';
    case 'running': return 'run';
    case 'failed': return 'ERR';
    case 'skipped': return 'skip';
    default: return '---';
  }
}

export default function ConductorProgress() {
  const { currentRun, isRunning, isPaused, projectId } = useConductorStatus(true);
  const { recoveredRunIds, dismissed, dismiss } = useConductorRecovery();

  // Show recovery banner if runs were interrupted and no active run
  if (!dismissed && recoveredRunIds.length > 0 && !currentRun) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs text-amber-300">
          {recoveredRunIds.length} conductor run{recoveredRunIds.length > 1 ? 's' : ''} interrupted by restart
        </span>
        <button
          onClick={dismiss}
          className="ml-auto p-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Don't render if no active run
  if (!currentRun || (currentRun.status !== 'running' && currentRun.status !== 'paused')) {
    return null;
  }

  const handlePause = async () => {
    await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', runId: currentRun.id, projectId }),
    });
    useConductorStore.getState().pauseRun();
  };

  const handleResume = async () => {
    await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume', runId: currentRun.id, projectId }),
    });
    useConductorStore.getState().resumeRun();
  };

  const handleStop = async () => {
    await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', runId: currentRun.id, projectId }),
    });
    useConductorStore.getState().stopRun();
  };

  const stageStatusText = PIPELINE_STAGES.map((stage) => {
    const state: StageState = currentRun.stages[stage];
    return `${stage.slice(0, 3).toUpperCase()}:${stageShort(state)}`;
  }).join(' ');

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5 border-b border-cyan-500/20">
      {/* Icon */}
      <div className="w-7 h-7 rounded-md bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-cyan-300">
          Conductor C{currentRun.cycle}{isPaused ? ' (paused)' : ''}
        </span>
        <span className="text-[10px] text-gray-500 font-mono truncate">
          {stageStatusText}
        </span>
      </div>

      {/* Compact metrics */}
      <div className="text-[10px] text-gray-500 font-mono hidden sm:flex gap-2 shrink-0">
        <span>{currentRun.metrics.ideasGenerated}ideas</span>
        <span>{currentRun.metrics.tasksCreated}tasks</span>
        {currentRun.metrics.tasksFailed > 0 && (
          <span className="text-red-400">{currentRun.metrics.tasksFailed}fail</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {isRunning ? (
          <button
            onClick={handlePause}
            className="p-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-400 transition-colors"
            title="Pause Pipeline"
          >
            <Pause className="w-3 h-3" />
          </button>
        ) : isPaused ? (
          <button
            onClick={handleResume}
            className="p-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 transition-colors"
            title="Resume Pipeline"
          >
            <Play className="w-3 h-3" />
          </button>
        ) : null}
        <button
          onClick={handleStop}
          className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-colors"
          title="Stop Pipeline"
        >
          <Square className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

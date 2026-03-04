/**
 * PipelineControls — Run/Pause/Stop buttons with cycle counter and status
 */

'use client';

import { motion } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, Activity, Settings2, TerminalSquare } from 'lucide-react';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import type { PipelineStatus } from '../../lib/conductor/types';

interface PipelineControlsProps {
  projectId: string | null;
  onStart: () => void;
  onOpenSettings?: () => void;
}

const STATUS_BADGES: Record<PipelineStatus, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-gray-700 text-gray-300' },
  running: { label: 'Running', className: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40' },
  paused: { label: 'Paused', className: 'bg-amber-600/20 text-amber-400 border border-amber-600/40' },
  stopping: { label: 'Stopping...', className: 'bg-red-600/20 text-red-400 border border-red-600/40' },
  completed: { label: 'Completed', className: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/40' },
  failed: { label: 'Failed', className: 'bg-red-600/20 text-red-400 border border-red-600/40' },
  interrupted: { label: 'Interrupted', className: 'bg-amber-600/20 text-amber-400 border border-amber-600/40' },
};

export default function PipelineControls({ projectId, onStart, onOpenSettings }: PipelineControlsProps) {
  const { currentRun, isRunning, isPaused, nerdMode, toggleNerdMode } = useConductorStore();

  const status: PipelineStatus = currentRun?.status ?? 'idle';
  const cycle = currentRun?.cycle ?? 0;
  const maxCycles = currentRun?.config.maxCyclesPerRun ?? 0;
  const badge = STATUS_BADGES[status];

  const handlePause = async () => {
    if (!currentRun) return;
    await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', runId: currentRun.id, projectId }),
    });
    useConductorStore.getState().pauseRun();
  };

  const handleResume = async () => {
    if (!currentRun) return;
    await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume', runId: currentRun.id, projectId }),
    });
    useConductorStore.getState().resumeRun();
  };

  const handleStop = async () => {
    if (!currentRun) return;
    await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', runId: currentRun.id, projectId }),
    });
    useConductorStore.getState().stopRun();
  };

  const handlePlayPause = () => {
    if (!isRunning && !isPaused) {
      onStart();
    } else if (isPaused) {
      handleResume();
    } else {
      handlePause();
    }
  };

  return (
    <motion.div
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-800 bg-gray-900/50"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="pipeline-controls"
    >
      {/* Status Badge */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {isRunning && (
          <motion.span
            className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {badge.label}
      </div>

      {/* Play/Pause Button */}
      <motion.button
        onClick={handlePlayPause}
        disabled={!projectId || status === 'stopping'}
        className={`p-2.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed
          ${isRunning
            ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/40'
            : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/40'
          }
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isRunning ? 'Pause Pipeline' : isPaused ? 'Resume Pipeline' : 'Start Pipeline'}
        data-testid="pipeline-play-btn"
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </motion.button>

      {/* Stop Button */}
      <motion.button
        onClick={handleStop}
        disabled={!isRunning && !isPaused}
        className="p-2.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20
          border border-red-600/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Stop Pipeline"
        data-testid="pipeline-stop-btn"
      >
        <Square className="w-4 h-4" />
      </motion.button>

      {/* Settings Button */}
      <motion.button
        onClick={onOpenSettings}
        disabled={isRunning || isPaused}
        className="p-2.5 rounded-lg bg-gray-700/30 text-gray-400 hover:bg-gray-700/50
          hover:text-gray-300 border border-gray-700 transition-all
          disabled:opacity-30 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Pipeline Settings"
        data-testid="pipeline-settings-btn"
      >
        <Settings2 className="w-4 h-4" />
      </motion.button>

      {/* Nerd Mode Toggle */}
      <motion.button
        onClick={toggleNerdMode}
        className={`p-2.5 rounded-lg transition-all border ${
          nerdMode
            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
            : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border-gray-700'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={nerdMode ? 'Switch to rich UI' : 'Nerd mode (minimal UI)'}
        data-testid="pipeline-nerd-mode-btn"
      >
        <TerminalSquare className="w-4 h-4" />
      </motion.button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Cycle Counter */}
      <div className="flex items-center gap-2">
        <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-sm font-mono">
          <span className="text-gray-300">Cycle </span>
          <span className="text-cyan-400 font-bold">{cycle}</span>
          {maxCycles > 0 && (
            <span className="text-gray-500">/{maxCycles}</span>
          )}
        </span>
      </div>

      {/* Current Stage Label */}
      {currentRun && (
        <>
          <div className="w-px h-6 bg-gray-700" />
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm text-gray-400 capitalize">
              {currentRun.currentStage}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}

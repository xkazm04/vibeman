/**
 * AutomationControls Component
 * Start/Stop/Run controls for automation
 */

'use client';

import { Play, Pause, RefreshCw, Wand2, Bot } from 'lucide-react';
import type { AutomationStatus } from '../types';

interface AutomationControlsProps {
  status: AutomationStatus | null;
  isRunning: boolean;
  isGenerating: boolean;
  onStart: () => void;
  onStop: () => void;
  onRunNow: () => void;
  onGenerateGoals: () => void;
}

export function AutomationControls({
  status,
  isRunning,
  isGenerating,
  onStart,
  onStop,
  onRunNow,
  onGenerateGoals,
}: AutomationControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`p-1.5 rounded-lg ${
          status?.running ? 'bg-emerald-500/20' : 'bg-gray-700/50'
        }`}
      >
        <Bot
          className={`w-4 h-4 ${
            status?.running ? 'text-emerald-400' : 'text-gray-400'
          }`}
        />
      </div>

      {/* Start/Stop Toggle */}
      <button
        onClick={status?.running ? onStop : onStart}
        className={`p-1.5 rounded-lg transition-colors ${
          status?.running
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
        }`}
        title={status?.running ? 'Stop automation' : 'Start automation'}
      >
        {status?.running ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* Run Now (full cycle) */}
      <button
        onClick={onRunNow}
        disabled={isRunning || isGenerating}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
        title="Run full cycle (evaluate, update, generate)"
      >
        <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
      </button>

      {/* Generate Goals + Claude Code Tasks */}
      <button
        onClick={onGenerateGoals}
        disabled={isRunning || isGenerating}
        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
          isGenerating
            ? 'bg-purple-500/20 text-purple-400'
            : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
        }`}
        title="Generate new goals & create Claude Code tasks"
      >
        <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
      </button>
    </div>
  );
}

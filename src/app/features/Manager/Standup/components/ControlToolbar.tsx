/**
 * ControlToolbar Component
 * Automation control bar with start/stop, run now, and config selectors
 */

'use client';

import { Play, Square, Zap, Timer, Loader2 } from 'lucide-react';
import { ConfigSelector } from './ConfigSelector';
import {
  INTERVALS,
  AUTONOMY_LEVELS,
  STRATEGIES,
  type AutomationConfig,
  type AutomationStatus,
} from '../lib/standupConfig';

interface ControlToolbarProps {
  status: AutomationStatus | null;
  config: AutomationConfig | null;
  isRunning: boolean;
  isGenerating: boolean;
  onStart: () => void;
  onStop: () => void;
  onRunNow: () => void;
  onConfigUpdate: (updates: Partial<AutomationConfig>) => void;
}

export function ControlToolbar({
  status,
  config,
  isRunning,
  isGenerating,
  onStart,
  onStop,
  onRunNow,
  onConfigUpdate,
}: ControlToolbarProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status?.isRunning ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          )}
          <span className="text-xs text-gray-400">
            {status?.isRunning ? 'Active' : 'Idle'}
          </span>
        </div>

        <div className="w-px h-5 bg-gray-700" />

        {/* Start/Stop */}
        {status?.isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Stop</span>
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Start</span>
          </button>
        )}

        {/* Run Now */}
        <button
          onClick={onRunNow}
          disabled={isRunning || isGenerating}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
            isRunning || isGenerating
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
          }`}
        >
          {isRunning || isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          <span className="text-xs font-medium">
            {isRunning ? 'Running...' : isGenerating ? 'Generating...' : 'Run Now'}
          </span>
        </button>

        <div className="w-px h-5 bg-gray-700" />

        {/* Config selectors */}
        <ConfigSelector
          label="Interval"
          options={INTERVALS}
          value={config?.intervalMinutes}
          onChange={(v) => onConfigUpdate({ intervalMinutes: v })}
        />

        <ConfigSelector
          label="Autonomy"
          options={AUTONOMY_LEVELS}
          value={config?.autonomyLevel}
          onChange={(v) => onConfigUpdate({ autonomyLevel: v as AutomationConfig['autonomyLevel'] })}
        />

        <ConfigSelector
          label="Strategy"
          options={STRATEGIES}
          value={config?.strategy}
          onChange={(v) => onConfigUpdate({ strategy: v as AutomationConfig['strategy'] })}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        {status?.lastRun && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Timer className="w-3.5 h-3.5" />
            <span>Last: {new Date(status.lastRun).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlToolbar;

'use client';

import { SessionState } from '../../lib';

interface ConvControlsProps {
  sessionState: SessionState;
  isPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}

export default function ConvControls({
  sessionState,
  isPlaying,
  onStart,
  onStop,
  onClear
}: ConvControlsProps) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">Controls</label>
      <div className="flex gap-2 mb-2">
        {!isPlaying ? (
          <button
            onClick={onStart}
            disabled={sessionState === 'processing'}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            ⏹ Stop
          </button>
        )}
        <button
          onClick={onClear}
          disabled={isPlaying}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Status:</span>
        <span className={`font-medium ${
          sessionState === 'active' ? 'text-green-400' :
          sessionState === 'processing' ? 'text-yellow-400' :
          sessionState === 'error' ? 'text-red-400' :
          'text-gray-400'
        }`}>
          {sessionState.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

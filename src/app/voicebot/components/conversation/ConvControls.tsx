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
      <h3 className="text-sm font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        Controls
      </h3>
      <div className="flex gap-3 mb-3">
        {!isPlaying ? (
          <button
            onClick={onStart}
            disabled={sessionState === 'processing'}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Start Test
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            Stop Test
          </button>
        )}
        <button
          onClick={onClear}
          disabled={isPlaying}
          className="px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-slate-500/20 hover:shadow-slate-500/40 disabled:shadow-none flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Clear
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-sm bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-700/50">
        <span className="text-slate-400 font-medium">Status:</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            sessionState === 'active' ? 'bg-green-400 shadow-lg shadow-green-400/50' :
            sessionState === 'processing' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' :
            sessionState === 'error' ? 'bg-red-400 shadow-lg shadow-red-400/50' :
            'bg-gray-400 shadow-lg shadow-gray-400/30'
          }`} />
          <span className={`font-semibold ${
            sessionState === 'active' ? 'text-green-400' :
            sessionState === 'processing' ? 'text-yellow-400' :
            sessionState === 'error' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {sessionState.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

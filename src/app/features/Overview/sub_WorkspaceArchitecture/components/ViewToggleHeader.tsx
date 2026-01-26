'use client';

import React from 'react';
import { ChevronLeft, Activity, Network } from 'lucide-react';

export type OverviewView = 'architecture' | 'observatory';

interface ViewToggleHeaderProps {
  view: OverviewView;
  onViewChange: (view: OverviewView) => void;
  selectedProjectName?: string | null;
  onBack?: () => void;
}

export function ViewToggleHeader({
  view,
  onViewChange,
  selectedProjectName,
  onBack,
}: ViewToggleHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-cyan-500/10 backdrop-blur-md">
      {/* Left: Back button and title */}
      <div className="flex items-center gap-3 min-w-[200px]">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/20 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}

        <div className="text-sm font-medium text-zinc-200">
          {selectedProjectName ? (
            <span className="flex items-center gap-2">
              <span className="text-zinc-500">Overview /</span>
              <span className="text-cyan-400">{selectedProjectName}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-cyan-400/80">Workspace</span>
              <span className="text-zinc-400">Overview</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: Main view toggle */}
      <div className="flex items-center gap-1 p-1 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
        <button
          onClick={() => onViewChange('architecture')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all
            ${view === 'architecture'
              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
            }
          `}
        >
          <Network className={`w-3.5 h-3.5 ${view === 'architecture' ? 'text-cyan-400' : ''}`} />
          Architecture
        </button>
        <button
          onClick={() => onViewChange('observatory')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all
            ${view === 'observatory'
              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
            }
          `}
        >
          <Activity className={`w-3.5 h-3.5 ${view === 'observatory' ? 'text-cyan-400' : ''}`} />
          Observatory
        </button>
      </div>

      {/* Right: Spacer for balance */}
      <div className="min-w-[200px]" />
    </div>
  );
}

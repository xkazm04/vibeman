'use client';

import { Maximize2 } from 'lucide-react';
import type { SignalType, Group } from '../lib/types';
import { COLORS, LABELS } from '../lib/constants';

interface CanvasToolbarProps {
  zoomLevel: number;
  groups: Group[];
  eventCount: number;
  focusedGroup: Group | null;
  selectedGroupId: string | null;
  onFitToView: () => void;
}

export function CanvasToolbar({
  zoomLevel,
  groups,
  eventCount,
  focusedGroup,
  selectedGroupId,
  onFitToView,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/70 backdrop-blur-md border-t border-zinc-700/30 text-xs">
      <div className="flex items-center gap-4">
        <span className="text-zinc-500">
          <span className="text-zinc-300 font-medium">{Math.round(zoomLevel * 100)}%</span>
        </span>
        {focusedGroup ? (
          <span className="text-zinc-300">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/40">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: focusedGroup.dominantColor }} />
              <span className="font-medium">{focusedGroup.name}</span>
              <span className="text-zinc-500">{focusedGroup.events.length}</span>
            </span>
          </span>
        ) : (
          <>
            {selectedGroupId ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/40">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: groups.find(g => g.id === selectedGroupId)?.dominantColor }} />
                <span className="font-medium text-zinc-200">
                  {groups.find(g => g.id === selectedGroupId)?.name}
                </span>
                <span className="text-zinc-500 text-[10px]">Enter ↵</span>
              </span>
            ) : (
              <>
                <span className="text-zinc-500">
                  <span className="text-zinc-300">{groups.length}</span> groups
                </span>
                <span className="text-zinc-500">
                  <span className="text-zinc-300">{eventCount}</span> events
                </span>
              </>
            )}
            <span className="text-zinc-600 text-[10px] hidden md:inline">
              ←→ navigate · ↵ focus · Esc clear
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {Object.entries(COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}40` }} />
            <span className="text-zinc-500 hidden lg:inline">{LABELS[type as SignalType]}</span>
          </div>
        ))}
        {!focusedGroup && (
          <button
            onClick={onFitToView}
            className="ml-1 p-1.5 rounded-md hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-200 transition-all"
            title="Fit to view"
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

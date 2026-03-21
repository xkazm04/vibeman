'use client';

import { Maximize2 } from 'lucide-react';
import type { SignalType, Group } from '../lib/types';
import { COLORS, LABELS } from '../lib/constants';
import BrainStatusBar from '../../components/BrainStatusBar';

interface CanvasToolbarProps {
  zoomLevel: number;
  groups: Group[];
  eventCount: number;
  focusedGroup: Group | null;
  selectedGroupId: string | null;
  onFitToView: () => void;
  visibleTypes: Set<SignalType>;
  onToggleType: (type: SignalType) => void;
}

export function CanvasToolbar({
  zoomLevel,
  groups,
  eventCount,
  focusedGroup,
  selectedGroupId,
  onFitToView,
  visibleTypes,
  onToggleType,
}: CanvasToolbarProps) {
  return (
    <BrainStatusBar
      left={
        <>
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
                  <span className="text-zinc-500 text-2xs">Enter ↵</span>
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
              <span className="text-zinc-600 text-2xs hidden md:inline">
                ←→ navigate · ↵ focus · Esc clear
              </span>
            </>
          )}
        </>
      }
      right={
        <>
          {Object.entries(COLORS).map(([type, color]) => {
            const isVisible = visibleTypes.has(type as SignalType);
            return (
              <button
                key={type}
                onClick={() => onToggleType(type as SignalType)}
                aria-label={`${isVisible ? 'Hide' : 'Show'} ${LABELS[type as SignalType]}`}
                className={`flex items-center gap-1.5 transition-colors outline-none ${
                  isVisible ? 'opacity-100' : 'opacity-30'
                }`}
                title={`${isVisible ? 'Hide' : 'Show'} ${LABELS[type as SignalType]}`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className={`hidden lg:inline ${isVisible ? 'text-zinc-500' : 'text-zinc-600 line-through'}`}>
                  {LABELS[type as SignalType]}
                </span>
              </button>
            );
          })}
          {!focusedGroup && (
            <button
              onClick={onFitToView}
              aria-label="Fit to view"
              className="ml-1 p-1 rounded-sm text-zinc-600 hover:text-zinc-300 border border-zinc-800/50 hover:border-zinc-700 transition-colors outline-none"
              title="Fit to view"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </>
      }
    />
  );
}

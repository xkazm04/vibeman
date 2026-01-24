'use client';

import { Undo2 } from 'lucide-react';
import type { UndoEntry } from '../lib/types';

interface UndoToastsProps {
  undoStack: UndoEntry[];
  onUndo: (entry: UndoEntry) => void;
}

export function UndoToasts({ undoStack, onUndo }: UndoToastsProps) {
  if (undoStack.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {undoStack.map((entry) => (
        <div key={entry.event.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800/95 backdrop-blur-sm border border-zinc-600/50 shadow-xl">
          <span className="text-xs text-zinc-300">Event deleted</span>
          <button
            onClick={() => onUndo(entry)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors"
          >
            <Undo2 size={11} />
            Undo
          </button>
        </div>
      ))}
    </div>
  );
}

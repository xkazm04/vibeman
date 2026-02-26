'use client';

import React, { useState } from 'react';
import { DbIdea } from '@/app/db';
import KanbanCard from './KanbanCard';

export type IdeaStatus = 'pending' | 'accepted' | 'rejected' | 'implemented';

interface ColumnConfig {
  status: IdeaStatus;
  label: string;
  dotColor: string;
  dropBorderColor: string;
  wipLimit?: number;
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { status: 'pending', label: 'Pending', dotColor: 'bg-zinc-400', dropBorderColor: 'border-zinc-400' },
  { status: 'accepted', label: 'Accepted', dotColor: 'bg-green-400', dropBorderColor: 'border-green-400', wipLimit: 20 },
  { status: 'rejected', label: 'Rejected', dotColor: 'bg-red-400', dropBorderColor: 'border-red-400' },
  { status: 'implemented', label: 'Implemented', dotColor: 'bg-amber-400', dropBorderColor: 'border-amber-400' },
];

interface KanbanColumnProps {
  config: ColumnConfig;
  ideas: DbIdea[];
  onIdeaClick: (idea: DbIdea) => void;
  onDrop: (ideaId: string, newStatus: IdeaStatus) => void;
  onDragStart: (e: React.DragEvent, idea: DbIdea) => void;
}

export default function KanbanColumn({ config, ideas, onIdeaClick, onDrop, onDragStart }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isOverWip = config.wipLimit !== undefined && ideas.length > config.wipLimit;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const ideaId = e.dataTransfer.getData('text/plain');
    if (ideaId) {
      onDrop(ideaId, config.status);
    }
  };

  return (
    <div
      className={`flex flex-col min-w-[260px] max-w-[320px] flex-1 rounded-xl border transition-colors ${
        isDragOver
          ? `border-dashed ${config.dropBorderColor} bg-white/5`
          : 'border-zinc-800/50 bg-zinc-900/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/40">
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <span className="text-sm font-medium text-zinc-300">{config.label}</span>
        <span className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
          isOverWip ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800/60 text-zinc-500'
        }`}>
          {ideas.length}
          {config.wipLimit !== undefined && (
            <span className="text-zinc-600">/{config.wipLimit}</span>
          )}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
        {ideas.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-zinc-600">
            No ideas
          </div>
        ) : (
          ideas.map((idea) => (
            <KanbanCard
              key={idea.id}
              idea={idea}
              onClick={onIdeaClick}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

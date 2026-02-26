'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { getCategoryConfig, effortScale, impactScale, EffortIcon, ImpactIcon } from '../lib/ideaConfig';
import { getAgent, type ScanType } from '../lib/scanTypes';

interface KanbanCardProps {
  idea: DbIdea;
  onClick: (idea: DbIdea) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, idea: DbIdea) => void;
}

/** Extracts a short color name from the agent's gradient class string */
function getScanTypeAccent(scanType: string): string {
  const agent = getAgent(scanType as ScanType);
  if (!agent) return 'border-l-zinc-500';
  // Extract the primary color from the agent color string (e.g. "from-indigo-500/20" → "indigo")
  const match = agent.color.match(/from-(\w+)-500/);
  if (match) {
    return `border-l-${match[1]}-500/60`;
  }
  return 'border-l-zinc-500';
}

const KanbanCard = React.memo(function KanbanCard({ idea, onClick, draggable = true, onDragStart }: KanbanCardProps) {
  const categoryConfig = getCategoryConfig(idea.category);
  const effortCfg = idea.effort ? effortScale.entries[idea.effort] || null : null;
  const impactCfg = idea.impact ? impactScale.entries[idea.impact] || null : null;
  const agent = getAgent(idea.scan_type as ScanType);

  return (
    <div
      className={`group relative bg-zinc-800/60 border border-zinc-700/50 border-l-2 ${getScanTypeAccent(idea.scan_type)} rounded-lg p-2.5 cursor-pointer hover:bg-zinc-700/50 hover:border-zinc-600/60 transition-all`}
      onClick={() => onClick(idea)}
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, idea) : undefined}
    >
      {/* Drag handle */}
      {draggable && (
        <div className="absolute top-2 right-1.5 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="w-3 h-3 text-zinc-400" />
        </div>
      )}

      {/* Title */}
      <p className="text-xs text-zinc-200 font-medium leading-snug pr-4 line-clamp-2">
        {idea.title}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {/* Category */}
        <span className="text-[10px]" title={idea.category}>
          {categoryConfig.emoji}
        </span>

        {/* Scan type badge */}
        {agent && (
          <span
            className="text-[10px] px-1 py-0.5 rounded bg-zinc-700/60 text-zinc-400 truncate max-w-[80px]"
            title={agent.label}
          >
            {agent.emoji} {agent.label}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Impact badge */}
        {impactCfg && (
          <div className="flex items-center gap-0.5" title={`Impact: ${impactCfg.label}`}>
            <ImpactIcon className={`w-3 h-3 ${impactCfg.color}`} />
            <span className={`text-[10px] font-mono ${impactCfg.color}`}>{idea.impact}</span>
          </div>
        )}

        {/* Effort badge */}
        {effortCfg && (
          <div className="flex items-center gap-0.5" title={`Effort: ${effortCfg.label}`}>
            <EffortIcon className={`w-3 h-3 ${effortCfg.color}`} />
            <span className={`text-[10px] font-mono ${effortCfg.color}`}>{idea.effort}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default KanbanCard;

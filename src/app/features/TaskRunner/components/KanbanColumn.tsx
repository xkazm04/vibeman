/**
 * KanbanColumn
 *
 * A single column in the kanban board. Serves as a drop zone for
 * dragged cards and renders a scrollable list of KanbanTaskCards.
 */

'use client';

import React from 'react';
import { useDroppableZone } from '@/hooks/dnd';
import type { KanbanColumnConfig, ProjectRequirement } from '../lib/types';
import KanbanTaskCard from './KanbanTaskCard';

interface KanbanColumnProps {
  config: KanbanColumnConfig;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  isDragActive: boolean;
  getRequirementId: (req: ProjectRequirement) => string;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onReset?: (reqId: string) => void;
}

const COLUMN_DROP_STYLES: Record<string, { readyBorderColor: string; hoverBorderColor: string; hoverBackground: string; readyBackground: string }> = {
  'backlog': {
    readyBorderColor: 'rgba(156, 163, 175, 0.3)',
    hoverBorderColor: 'rgba(156, 163, 175, 0.6)',
    readyBackground: 'rgba(156, 163, 175, 0.03)',
    hoverBackground: 'rgba(156, 163, 175, 0.08)',
  },
  'in-progress': {
    readyBorderColor: 'rgba(96, 165, 250, 0.3)',
    hoverBorderColor: 'rgba(96, 165, 250, 0.6)',
    readyBackground: 'rgba(96, 165, 250, 0.03)',
    hoverBackground: 'rgba(96, 165, 250, 0.08)',
  },
  'done': {
    readyBorderColor: 'rgba(74, 222, 128, 0.3)',
    hoverBorderColor: 'rgba(74, 222, 128, 0.6)',
    readyBackground: 'rgba(74, 222, 128, 0.03)',
    hoverBackground: 'rgba(74, 222, 128, 0.08)',
  },
  'failed': {
    readyBorderColor: 'rgba(248, 113, 113, 0.3)',
    hoverBorderColor: 'rgba(248, 113, 113, 0.6)',
    readyBackground: 'rgba(248, 113, 113, 0.03)',
    hoverBackground: 'rgba(248, 113, 113, 0.08)',
  },
};

export default React.memo(function KanbanColumn({
  config,
  requirements,
  selectedRequirements,
  isDragActive,
  getRequirementId,
  onToggleSelect,
  onDelete,
  onReset,
}: KanbanColumnProps) {
  const dropStyles = COLUMN_DROP_STYLES[config.id] ?? COLUMN_DROP_STYLES['backlog'];

  const {
    ref,
    isOver,
    zoneStyle,
  } = useDroppableZone({
    id: `kanban-col-${config.id}`,
    data: { type: 'kanban-column', columnId: config.id },
    isDragActive,
    styleConfig: {
      idleBackground: 'transparent',
      idleBorderColor: 'rgba(55, 65, 81, 0.4)',
      ...dropStyles,
      hoverScale: 1,
    },
  });

  return (
    <div
      ref={ref}
      className={`flex flex-col min-w-[240px] flex-1 rounded-xl border transition-colors ${
        isOver ? 'border-dashed' : ''
      } bg-gray-900/30`}
      style={zoneStyle}
      data-testid={`kanban-col-${config.id}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/40">
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <span className="text-sm font-medium text-gray-300">{config.label}</span>
        <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-500">
          {requirements.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[calc(100vh-320px)]">
        {requirements.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-gray-600">
            No tasks
          </div>
        ) : (
          requirements.map((req) => {
            const reqId = getRequirementId(req);
            return (
              <KanbanTaskCard
                key={reqId}
                requirement={req}
                requirementId={reqId}
                isSelected={selectedRequirements.has(reqId)}
                onToggleSelect={() => onToggleSelect(reqId)}
                onDelete={() => onDelete(reqId)}
                onReset={onReset ? () => onReset(reqId) : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
});

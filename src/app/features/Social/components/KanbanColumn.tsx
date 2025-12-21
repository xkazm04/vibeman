'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Search,
  User,
  Bot,
  CheckCircle,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import type { FeedbackItem, KanbanColumnConfig } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult, AIProcessingStatus, DevTeam } from '../lib/types/aiTypes';
import KanbanCardCompact from './KanbanCardCompact';
import { TeamIcon } from './TeamIcon';

// Icon mapping for column iconName
const ColumnIcons: Record<string, LucideIcon> = {
  inbox: Inbox,
  search: Search,
  user: User,
  bot: Bot,
  'check-circle': CheckCircle,
};

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  items: FeedbackItem[];
  isDragOver: boolean;
  isValidDrop: boolean;
  dropReason?: string;
  isDragging?: boolean;
  selectedIds: Set<string>;
  processingStatus?: AIProcessingStatus;
  aiResults?: Map<string, FeedbackAnalysisResult>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onCardDragStart: (e: React.DragEvent, item: FeedbackItem) => void;
  onCardDragEnd: (e: React.DragEvent) => void;
  onCardClick: (item: FeedbackItem) => void;
  onCardDoubleClick?: (item: FeedbackItem) => void;
  onCardRightClick: (item: FeedbackItem, e: React.MouseEvent) => void;
  onCardAction: (action: string, item: FeedbackItem) => void;
  draggingItem: FeedbackItem | null;
  headerActions?: React.ReactNode;
}

export default function KanbanColumn({
  column,
  items,
  isDragOver,
  isValidDrop,
  dropReason,
  isDragging = false,
  selectedIds,
  processingStatus,
  aiResults,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  onCardDoubleClick,
  onCardRightClick,
  onCardAction,
  draggingItem,
  headerActions,
}: KanbanColumnProps) {
  const getBorderColor = () => {
    switch (column.id) {
      case 'manual':
        return 'border-l-yellow-500';
      case 'automatic':
        return 'border-l-cyan-500';
      case 'done':
        return 'border-l-green-500';
      default:
        return '';
    }
  };

  const getDropIndicatorClass = () => {
    if (isDragging && !isDragOver) {
      if (isValidDrop) return 'border-green-500/30 bg-green-500/5';
      return 'border-red-500/20 bg-red-500/5 opacity-75';
    }
    if (isDragOver) {
      if (isValidDrop) return 'bg-green-500/15 border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
      return 'bg-red-500/15 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    }
    return '';
  };

  const selectedInColumn = items.filter((item) => selectedIds.has(item.id)).length;

  // Calculate team distribution for this column
  const teamDistribution = useMemo(() => {
    const distribution: Partial<Record<DevTeam, number>> = {};
    items.forEach((item) => {
      const team = item.analysis?.assignedTeam || aiResults?.get(item.id)?.assignedTeam;
      if (team) {
        distribution[team] = (distribution[team] || 0) + 1;
      }
    });
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [items, aiResults]);

  return (
    <div
      className={`
        relative flex-1 min-w-[260px] max-w-[320px] flex flex-col
        bg-gray-900/40 backdrop-blur-md rounded-lg
        border border-gray-700/40
        ${getDropIndicatorClass()}
        transition-all duration-150
      `}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-column-id={column.id}
      data-testid={`kanban-column-${column.id}`}
    >
      {/* Column Header - Compact */}
      <div
        className={`
          px-3 py-2 border-b border-gray-700/40
          sticky top-0 bg-gray-900/60 backdrop-blur-md z-10
          ${getBorderColor() ? `border-l-[3px] ${getBorderColor()}` : ''}
        `}
      >
        <div className="flex items-center gap-1.5">
          {(() => {
            const IconComponent = ColumnIcons[column.iconName];
            return IconComponent ? (
              <IconComponent className="w-3.5 h-3.5 text-gray-400" />
            ) : null;
          })()}
          <h3 className="text-xs font-semibold text-gray-200">
            {column.title}
          </h3>
          {column.id !== 'new' && selectedInColumn > 0 && (
            <span className="px-1 py-0.5 text-[9px] font-medium text-white bg-cyan-500 rounded">
              {selectedInColumn}
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono text-gray-500">
            {items.length}
          </span>
        </div>
        {headerActions && (
          <div className="mt-2 pt-2 border-t border-gray-700/40">
            {headerActions}
          </div>
        )}
      </div>

      {/* Column Body */}
      <div
        className="flex-1 px-2 py-2 overflow-y-auto flex flex-col gap-1 custom-scrollbar min-h-[60vh]"
        role="list"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <KanbanCardCompact
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isProcessing={selectedIds.has(item.id) && processingStatus === 'processing'}
              aiResult={aiResults?.get(item.id)}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onClick={onCardClick}
              onRightClick={onCardRightClick}
              onAction={onCardAction}
            />
          ))}
        </AnimatePresence>

        {/* Drop placeholder when dragging over empty valid column */}
        {isDragOver && isValidDrop && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 100 }}
            exit={{ opacity: 0, height: 0 }}
            className="border-2 border-dashed border-green-500 rounded-lg bg-green-500/10 flex items-center justify-center"
          >
            <span className="text-xs text-green-400 font-medium">Drop here</span>
          </motion.div>
        )}

        {/* Invalid drop feedback tooltip */}
        <AnimatePresence>
          {isDragOver && !isValidDrop && dropReason && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
            >
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/95 border border-red-500/50 shadow-lg backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-100 font-medium whitespace-nowrap">
                  {dropReason}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {items.length === 0 && !isDragOver && (
          <div className="flex-1 flex items-center justify-center text-center py-8">
            <div className="text-gray-500">
              {(() => {
                const IconComponent = ColumnIcons[column.iconName];
                return IconComponent ? (
                  <IconComponent className="w-8 h-8 mx-auto mb-2 opacity-30" />
                ) : null;
              })()}
              <p className="text-xs">No items</p>
            </div>
          </div>
        )}

        {/* Column full indicator */}
        {column.maxItems && items.length >= column.maxItems && (
          <div className="text-center py-2 text-[10px] text-yellow-400">
            Queue full ({column.maxItems} max)
          </div>
        )}
      </div>

      {/* Team distribution footer */}
      {teamDistribution.length > 0 && (
        <div className="p-2 border-t border-gray-700/40 bg-gray-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-gray-500 mr-1">Teams:</span>
            {teamDistribution.map(([team, count]) => (
              <div key={team} className="flex items-center gap-0.5">
                <TeamIcon team={team as DevTeam} size="xs" />
                <span className="text-[9px] text-gray-500">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

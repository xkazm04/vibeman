'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, type LucideIcon } from 'lucide-react';
import type { FeedbackItem, KanbanChannel, KanbanStatus } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult, AIProcessingStatus } from '../lib/types/aiTypes';
import type { SwimlaneData } from './swimlanes/swimlaneTypes';
import { KANBAN_COLUMNS } from '../lib/config/columnConfig';
import KanbanColumn from './KanbanColumn';
import { SwimlanesView } from './swimlanes';
import { ChannelIconMap, ChannelColorMap } from './KanbanBoardConstants';

interface KanbanMainViewProps {
  viewMode: 'board' | 'swimlanes';
  filteredItemsByStatus: Record<KanbanStatus, FeedbackItem[]>;
  // Drag state
  dragOverColumn: string | null;
  draggingItem: FeedbackItem | null;
  canDrop: (fromStatus: KanbanStatus, toColumnId: KanbanStatus) => { allowed: boolean; reason?: string };
  handleDragOver: (columnId: KanbanStatus) => (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (columnId: KanbanStatus) => (e: React.DragEvent) => void;
  handleCardDragStart: (e: React.DragEvent, item: FeedbackItem) => void;
  handleCardDragEnd: (e: React.DragEvent) => void;
  // Selection state
  selectedIds: Set<string>;
  // AI Processing
  processingStatus: AIProcessingStatus;
  aiResults: Map<string, FeedbackAnalysisResult>;
  // Card handlers
  onCardClick: (item: FeedbackItem) => void;
  onCardRightClick: (item: FeedbackItem, e: React.MouseEvent) => void;
  onCardAction: (action: string, item: FeedbackItem) => void;
  // Channel loading
  configuredChannels: Set<KanbanChannel>;
  loadedChannels: Set<KanbanChannel>;
  loadingChannels: Set<KanbanChannel>;
  onLoadChannelData: (channel: KanbanChannel) => void;
  // Swimlanes
  swimlanes: SwimlaneData[];
  isCollapsed: (id: string) => boolean;
  onToggleCollapse: (id: string) => void;
  renderCard: (item: FeedbackItem) => React.ReactNode;
}

export function KanbanMainView({
  viewMode,
  filteredItemsByStatus,
  dragOverColumn,
  draggingItem,
  canDrop,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleCardDragStart,
  handleCardDragEnd,
  selectedIds,
  processingStatus,
  aiResults,
  onCardClick,
  onCardRightClick,
  onCardAction,
  configuredChannels,
  loadedChannels,
  loadingChannels,
  onLoadChannelData,
  swimlanes,
  isCollapsed,
  onToggleCollapse,
  renderCard,
}: KanbanMainViewProps) {
  if (viewMode === 'swimlanes') {
    return (
      <SwimlanesView
        swimlanes={swimlanes}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onCardClick={onCardClick}
        renderCard={renderCard}
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full custom-scrollbar" data-testid="kanban-columns">
      {KANBAN_COLUMNS.map((column) => {
        const isDragOver = dragOverColumn === column.id;
        const dropCheck = draggingItem
          ? canDrop(draggingItem.status, column.id)
          : { allowed: false, reason: undefined };

        return (
          <KanbanColumn
            key={column.id}
            column={column}
            items={filteredItemsByStatus[column.id]}
            isDragOver={isDragOver}
            isValidDrop={dropCheck.allowed}
            dropReason={dropCheck.reason}
            isDragging={!!draggingItem}
            selectedIds={selectedIds}
            processingStatus={processingStatus}
            aiResults={aiResults}
            onDragOver={handleDragOver(column.id)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(column.id)}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            onCardClick={onCardClick}
            onCardRightClick={onCardRightClick}
            onCardAction={onCardAction}
            draggingItem={draggingItem}
            headerActions={
              column.id === 'new' ? (
                <ChannelIconsHeader
                  configuredChannels={configuredChannels}
                  loadedChannels={loadedChannels}
                  loadingChannels={loadingChannels}
                  onLoadChannelData={onLoadChannelData}
                />
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}

interface ChannelIconsHeaderProps {
  configuredChannels: Set<KanbanChannel>;
  loadedChannels: Set<KanbanChannel>;
  loadingChannels: Set<KanbanChannel>;
  onLoadChannelData: (channel: KanbanChannel) => void;
}

function ChannelIconsHeader({
  configuredChannels,
  loadedChannels,
  loadingChannels,
  onLoadChannelData,
}: ChannelIconsHeaderProps) {
  if (configuredChannels.size === 0) {
    return <span className="text-xs text-gray-500 italic px-2">No channels configured</span>;
  }

  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {(Object.entries(ChannelIconMap) as [KanbanChannel, LucideIcon][])
        .filter(([channel]) => configuredChannels.has(channel))
        .map(([channel, IconComponent]) => {
          const isLoaded = loadedChannels.has(channel);
          const isLoading = loadingChannels.has(channel);
          const colorClass = isLoaded ? ChannelColorMap[channel] : 'text-gray-600';

          return (
            <button
              key={channel}
              onClick={() => onLoadChannelData(channel)}
              disabled={isLoading}
              className={`p-1.5 rounded-md hover:bg-gray-700/60 transition-all ${colorClass} ${isLoaded ? 'ring-1 ring-current' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`${isLoading ? 'Loading...' : isLoaded ? 'Unload' : 'Load'} ${channel.replace('_', ' ')} feedback`}
              data-testid={`toggle-channel-${channel}-btn`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconComponent className="w-4 h-4" />
              )}
            </button>
          );
        })}
    </div>
  );
}

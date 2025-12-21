'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Activity, LayoutDashboard, Settings, Compass } from 'lucide-react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';
import CardDetailModal from './CardDetailModal';
import AIProcessingPanel from './AIProcessingPanel';
import { FilterBar } from './filters';
import { ViewToggle } from './swimlanes';
import { ActivityProvider, ActivityPanel } from './activity';
import KanbanCard from './KanbanCard';
import StatsBar from './StatsBar';
import { KanbanMainView } from './KanbanMainView';
import { KanbanStateProviders } from '../state';
import { useKanbanBoardLogic } from '../hooks/useKanbanBoardLogic';
import { useKanbanDragHandlers } from '../hooks/useKanbanDragHandlers';
import { useKanbanCardHandlers } from '../hooks/useKanbanCardHandlers';
import { useKanbanAIProcessing } from '../hooks/useKanbanAIProcessing';
import { ConfigurationPanel } from '../sub_SocConfig';
import { DiscoveryPanel } from '../sub_SocDiscovery';

type TabType = 'overview' | 'configuration' | 'discovery';

interface ToastType {
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

interface KanbanBoardProps {
  toast?: ToastType;
  projectId?: string;
}

// Default toast implementation
const defaultToast: ToastType = {
  success: (title, message) => console.log(`✓ ${title}: ${message}`),
  error: (title, message) => console.error(`✗ ${title}: ${message}`),
  info: (title, message) => console.info(`ℹ ${title}: ${message}`),
};

// Inner component that uses state providers
function KanbanBoardInner({ toast = defaultToast, projectId = 'default' }: KanbanBoardProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Get all state and handlers from the main logic hook
  const {
    dragState,
    selectionState,
    viewModeState,
    feedbackState,
    filtersState,
    swimlanesState,
    aiProcessingState,
    selectedItem,
    setSelectedItem,
    modalOpen,
    setModalOpen,
    feedbackItems,
    filteredItemsByStatus,
    loadedChannels,
    configuredChannels,
    loadingChannels,
    handleLoadChannelData,
    handleResetView,
    handleSelectAllNew,
    addEvent,
    createStatusChangeEvent,
    toast: boardToast,
  } = useKanbanBoardLogic({ toast, projectId });

  // Extract drag and drop handlers
  const { canDrop, handleDrop } = useKanbanDragHandlers({
    draggingItem: dragState.draggingItem,
    feedbackState,
    handleCardDragEnd: dragState.handleCardDragEnd,
    aiResults: aiProcessingState.results,
  });

  // Extract card handlers
  const cardHandlers = useKanbanCardHandlers({
    feedbackState,
    aiResults: aiProcessingState.results,
    requirementResults: aiProcessingState.requirementResults,
    toast: boardToast,
    addEvent,
    setSelectedItem,
    setModalOpen,
    createStatusChangeEvent,
  });

  // Extract AI processing logic
  const { handleProcessSelected } = useKanbanAIProcessing({
    feedbackItems,
    selectedIds: selectionState.selectedIds,
    aiResults: aiProcessingState.results,
    processFeedback: aiProcessingState.processFeedback,
    processRequirements: aiProcessingState.processRequirements,
    toast: boardToast,
  });

  const handleCardRightClick = useCallback(
    (item: FeedbackItem, e: React.MouseEvent) => {
      cardHandlers.handleCardRightClick(item, e, selectionState.toggleSelection);
    },
    [cardHandlers, selectionState.toggleSelection]
  );

  const handleModalAction = useCallback(
    (action: string) => {
      if (selectedItem) {
        cardHandlers.handleCardAction(action, selectedItem);
      }
      setModalOpen(false);
    },
    [selectedItem, cardHandlers, setModalOpen]
  );

  // Card renderer for swimlanes
  const renderCard = useCallback((item: FeedbackItem) => (
    <KanbanCard
      item={item}
      isSelected={selectionState.isSelected(item.id)}
      isProcessing={aiProcessingState.status === 'processing' && selectionState.selectedIds.has(item.id)}
      aiResult={aiProcessingState.results.get(item.id)}
      onDragStart={(e) => dragState.handleCardDragStart(e, item)}
      onDragEnd={dragState.handleCardDragEnd}
      onClick={() => cardHandlers.handleCardClick(item)}
      onRightClick={(_, e) => handleCardRightClick(item, e)}
      onAction={(action) => cardHandlers.handleCardAction(action, item)}
    />
  ), [
    selectionState,
    aiProcessingState,
    dragState,
    cardHandlers,
    handleCardRightClick,
  ]);

  return (
    <div className="h-full flex" data-testid="kanban-board">
      {/* Activity Panel (left) */}
      <ActivityPanel
        isOpen={viewModeState.activityPanelOpen}
        onClose={() => viewModeState.toggleActivityPanel()}
        onJumpToItem={(id) => {
          const item = feedbackState.getItem(id);
          if (item) {
            setSelectedItem(item);
            setModalOpen(true);
          }
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Switcher Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between flex-shrink-0"
        >
          {/* Tab Buttons */}
          <div className="flex items-center gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700/40">
            <button
              onClick={() => setActiveTab('overview')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'overview'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                }
              `}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'configuration'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'discovery'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                }
              `}
            >
              <Compass className="w-4 h-4" />
              Discovery
            </button>
          </div>

          {/* Right side controls - only show for Overview tab */}
          {activeTab === 'overview' && (
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <ViewToggle
                viewMode={viewModeState.viewMode}
                groupBy={viewModeState.groupBy}
                onViewModeChange={viewModeState.setViewMode}
                onGroupByChange={viewModeState.setGroupBy}
              />

              <div className="text-xs text-gray-400 flex items-center gap-3">
                <span>Total: {feedbackState.getTotalCount()}</span>
                {filtersState.activeFilterCount > 0 && (
                  <span className="text-yellow-400">Filtered: {filtersState.filteredCount}</span>
                )}
                <span className="text-green-400">Done: {feedbackState.getCountByStatus('done')}</span>
              </div>

              {/* Activity toggle */}
              <button
                onClick={() => viewModeState.toggleActivityPanel()}
                className={`p-2 rounded-lg transition-colors ${
                  viewModeState.activityPanelOpen
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
                }`}
                title="Toggle Activity Panel"
                data-testid="activity-panel-toggle"
              >
                <Activity className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetView}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 rounded-lg transition-colors"
                title="Reset view and start fresh"
                data-testid="reset-view-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset View
              </button>
            </div>
          )}
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <>
            {/* Filter Bar */}
            <div className="mb-4 flex-shrink-0">
              <FilterBar
                filters={filtersState.filters}
                onSearchChange={(value) => filtersState.setFilter('search', value)}
                onToggleFilter={filtersState.toggleArrayFilter}
                onClearFilters={filtersState.clearFilters}
                onClearField={(field) => filtersState.setFilter(field, field === 'search' ? '' : [])}
                activeFilterCount={filtersState.activeFilterCount}
                totalCount={filtersState.totalCount}
                filteredCount={filtersState.filteredCount}
              />
            </div>

            {/* Stats Bar */}
            <div className="mb-4 flex-shrink-0">
              <StatsBar
                stats={{
                  new: feedbackState.getCountByStatus('new'),
                  analyzed: feedbackState.getCountByStatus('analyzed'),
                  manual: feedbackState.getCountByStatus('manual'),
                  automatic: feedbackState.getCountByStatus('automatic'),
                  done: feedbackState.getCountByStatus('done'),
                }}
                aiStats={
                  aiProcessingState.results.size > 0
                    ? {
                        bugs: Array.from(aiProcessingState.results.values()).filter((r) => r.classification === 'bug').length,
                        features: Array.from(aiProcessingState.results.values()).filter((r) => r.classification === 'feature').length,
                        clarifications: Array.from(aiProcessingState.results.values()).filter((r) => r.classification === 'clarification').length,
                      }
                    : undefined
                }
              />
            </div>

            {/* AI Processing Panel */}
            <AIProcessingPanel
              selectedCount={selectionState.selectedCount}
              processingStatus={aiProcessingState.status}
              progress={aiProcessingState.progress}
              error={aiProcessingState.error}
              onProcess={handleProcessSelected}
              onClearSelection={selectionState.deselectAll}
              onSelectAllNew={handleSelectAllNew}
              newItemsCount={filteredItemsByStatus.new.length}
            />

            {/* Main view area */}
            <div className="flex-1 overflow-hidden">
              <KanbanMainView
                viewMode={viewModeState.viewMode}
                filteredItemsByStatus={filteredItemsByStatus}
                dragOverColumn={dragState.dragOverColumn}
                draggingItem={dragState.draggingItem}
                canDrop={canDrop}
                handleDragOver={dragState.handleDragOver}
                handleDragLeave={dragState.handleDragLeave}
                handleDrop={handleDrop}
                handleCardDragStart={dragState.handleCardDragStart}
                handleCardDragEnd={dragState.handleCardDragEnd}
                selectedIds={selectionState.selectedIds}
                processingStatus={aiProcessingState.status}
                aiResults={aiProcessingState.results}
                onCardClick={cardHandlers.handleCardClick}
                onCardRightClick={handleCardRightClick}
                onCardAction={cardHandlers.handleCardAction}
                configuredChannels={configuredChannels}
                loadedChannels={loadedChannels}
                loadingChannels={loadingChannels}
                onLoadChannelData={handleLoadChannelData}
                swimlanes={swimlanesState.swimlanes}
                isCollapsed={swimlanesState.isCollapsed}
                onToggleCollapse={swimlanesState.toggleCollapse}
                renderCard={renderCard}
              />
            </div>
          </>
        ) : activeTab === 'configuration' ? (
          /* Configuration Tab */
          <div className="flex-1 overflow-hidden">
            <ConfigurationPanel projectId={projectId} />
          </div>
        ) : (
          /* Discovery Tab */
          <div className="flex-1 overflow-hidden">
            <DiscoveryPanel projectId={projectId} />
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={modalOpen}
        item={selectedItem}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
        onAction={handleModalAction}
      />
    </div>
  );
}

// Wrapper component with all providers
export default function KanbanBoard(props: KanbanBoardProps) {
  return (
    <ActivityProvider>
      <KanbanStateProviders>
        <KanbanBoardInner {...props} />
      </KanbanStateProviders>
    </ActivityProvider>
  );
}

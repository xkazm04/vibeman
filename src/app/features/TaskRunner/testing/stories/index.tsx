/**
 * TaskRunner Stories Index
 *
 * Central export for all TaskRunner component stories.
 * Use this file to run all stories together in a development environment.
 */

'use client';

import React from 'react';

// Re-export stories with explicit naming to avoid conflicts
export {
  TaskItemIdle,
  TaskItemQueued,
  TaskItemRunning,
  TaskItemCompleted,
  TaskItemFailed,
  TaskItemSessionLimit,
  TaskItemSelected,
  TaskItemLongName,
  AllStatusVariants,
  InteractiveDemo as TaskItemInteractiveDemo,
} from './TaskItem.stories';

export {
  EmptyColumn,
  FewRequirements,
  ManyRequirements,
  MixedStatuses,
  AllSelected,
  PartialSelection,
  LongProjectName,
  MultipleColumnsGrid,
  InteractiveDemo as TaskColumnInteractiveDemo,
} from './TaskColumn.stories';

export {
  NoBatches,
  SingleIdleBatch,
  RunningBatch,
  PausedBatch,
  CompletedBatch,
  TwoBatchesRunning,
  AllFourBatches,
  BatchWithFailures,
  InteractiveDemo as DualBatchPanelInteractiveDemo,
} from './DualBatchPanel.stories';

// Import specific stories for the overview
import {
  AllStatusVariants as TaskItemAllVariants,
  InteractiveDemo as TaskItemInteractive,
} from './TaskItem.stories';
import {
  MixedStatuses as TaskColumnMixed,
  MultipleColumnsGrid,
} from './TaskColumn.stories';
import {
  AllFourBatches,
  InteractiveDemo as BatchPanelInteractive,
} from './DualBatchPanel.stories';

/**
 * Overview component showing all major stories
 */
export function StoriesOverview() {
  const [activeTab, setActiveTab] = React.useState<'taskItem' | 'taskColumn' | 'batchPanel'>(
    'taskItem'
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white">TaskRunner Component Stories</h1>
        <p className="text-sm text-gray-400 mt-1">
          Visual test cases and interactive demos for TaskRunner components
        </p>
      </div>

      {/* Navigation */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4">
        <nav className="flex gap-1">
          {[
            { id: 'taskItem' as const, label: 'TaskItem' },
            { id: 'taskColumn' as const, label: 'TaskColumn' },
            { id: 'batchPanel' as const, label: 'DualBatchPanel' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'taskItem' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">All Status Variants</h2>
              <TaskItemAllVariants />
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Interactive Demo</h2>
              <TaskItemInteractive />
            </section>
          </div>
        )}

        {activeTab === 'taskColumn' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Mixed Statuses</h2>
              <TaskColumnMixed />
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Multiple Columns Grid</h2>
              <MultipleColumnsGrid />
            </section>
          </div>
        )}

        {activeTab === 'batchPanel' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">All Four Batches</h2>
              <AllFourBatches />
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Interactive Demo</h2>
              <BatchPanelInteractive />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quick visual test runner
 * Renders all stories in sequence for quick visual verification
 */
export function QuickTestRunner() {
  return (
    <div className="min-h-screen bg-gray-950 p-4 space-y-12">
      <h1 className="text-2xl font-bold text-white">TaskRunner - Quick Test Runner</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">
          TaskItem Component
        </h2>
        <TaskItemAllVariants />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">
          TaskColumn Component
        </h2>
        <MultipleColumnsGrid />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">
          DualBatchPanel Component
        </h2>
        <AllFourBatches />
      </section>
    </div>
  );
}

export default StoriesOverview;

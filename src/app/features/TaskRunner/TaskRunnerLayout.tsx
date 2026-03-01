'use client';
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import { usePollingCleanupOnUnmount } from '@/app/features/TaskRunner/lib/pollingManager';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import { useRequirements } from '@/app/features/TaskRunner/hooks/useRequirements';



const TaskRunnerLayout = () => {
  // Cleanup all SSE/polling connections when navigating away from TaskRunner
  usePollingCleanupOnUnmount();

  const {
    requirementsWithStatus,
    groupedRequirements,
    selectedRequirements,
    isLoading,
    isRunning,
    processedCount,
    error,
    actions,
    toggleSelection,
    toggleProjectSelection,
    handleDelete,
    handleReset,
    handleBulkDelete,
    refreshProjectRequirements,
    getRequirementId,
  } = useRequirements();

  if (isLoading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-400 motion-safe:animate-spin motion-reduce:animate-pulse" />
          <p className="text-gray-400">Loading requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <LazyContentSection delay={0}>
          <TaskRunnerHeader
            selectedCount={selectedRequirements.size}
            totalCount={requirementsWithStatus.length}
            processedCount={processedCount}
            isRunning={isRunning}
            error={error}
            requirements={requirementsWithStatus}
            selectedRequirements={selectedRequirements}
            actions={actions}
            getRequirementId={getRequirementId}
          />
        </LazyContentSection>

        {/* Requirements Grid - Column Layout */}
        <LazyContentSection delay={0.2}>
          {requirementsWithStatus.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                No requirements found. Create requirements in your projects&apos; .claude/commands directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {Object.entries(groupedRequirements).map(([projectId, projectReqs]) => {
                  const projectName = projectReqs[0]?.projectName || 'Unknown Project';
                  const projectPath = projectReqs[0]?.projectPath || '';
                  return (
                    <TaskColumn
                      key={projectId}
                      projectId={projectId}
                      projectName={projectName}
                      projectPath={projectPath}
                      requirements={projectReqs}
                      selectedRequirements={selectedRequirements}
                      onToggleSelect={toggleSelection}
                      onDelete={handleDelete}
                      onReset={handleReset}
                      onBulkDelete={handleBulkDelete}
                      onToggleProjectSelection={toggleProjectSelection}
                      getRequirementId={getRequirementId}
                      onRefresh={() => refreshProjectRequirements(projectId, projectPath)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </LazyContentSection>
      </div>

    </div>
  );
};

export default React.memo(TaskRunnerLayout);

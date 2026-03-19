'use client';
import React, { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import ExternalRequirementsColumn from '@/app/features/TaskRunner/components/ExternalRequirementsColumn';
import { ConductorRow } from '@/app/features/TaskRunner/components/ConductorRow';
import { useConductorSync } from '@/app/features/TaskRunner/hooks/useConductorSync';
import { usePollingCleanupOnUnmount } from '@/app/features/TaskRunner/lib/pollingManager';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import { useRequirements } from '@/app/features/TaskRunner/hooks/useRequirements';
import { useTaskRunnerBatchData } from '@/app/features/TaskRunner/hooks/useTaskRunnerBatchData';
import { useActiveProjectStore } from '@/stores/clientProjectStore';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { clearSessionStrategy } from '@/components/cli/store/cliExecutionManager';
import { fetchAutoAssignConfig } from '@/lib/autoAssignConfig';
import { autoAssignTasks } from '@/app/features/TaskRunner/lib/autoAssigner';
import { createQueuedStatus } from '@/app/features/TaskRunner/lib/types';
import type { ProjectRequirement } from '@/app/features/TaskRunner/lib/types';
import type { DbIdea } from '@/app/db';



const TaskRunnerLayout = () => {
  // Cleanup all SSE/polling connections when navigating away from TaskRunner
  usePollingCleanupOnUnmount();

  // Active project for external requirements column
  const activeProject = useActiveProjectStore((s) => s.activeProject);

  const {
    requirements,
    groupedRequirements,
    selectedRequirements,
    isLoading,
    isRunning,
    processedCount,
    error,
    actions,
    toggleSelection,
    toggleProjectSelection,
    toggleContextSelection,
    handleDelete,
    handleReset,
    handleBulkDelete,
    refreshProjectRequirements,
    getRequirementId,
  } = useRequirements();

  // Batch-fetch aggregation, ideas, and contexts for ALL columns (3 calls instead of 3N)
  const { aggregationByProject, ideasMap, contextsMap } = useTaskRunnerBatchData(groupedRequirements);

  // Conductor pipeline sync — compact cards + Q&A detection
  const { runs: conductorRuns, qaCount: conductorQACount, refresh: refreshConductor } = useConductorSync();

  // Auto-assign handler: distributes selected idle requirements to free CLI sessions
  const handleAutoAssign = useCallback(async (
    selectedReqs: ProjectRequirement[],
    columnIdeasMap: Record<string, DbIdea | null>,
  ) => {
    const config = await fetchAutoAssignConfig();
    const sessions = useCLISessionStore.getState().sessions;
    const addTasksToSession = useCLISessionStore.getState().addTasksToSession;
    const setProvider = useCLISessionStore.getState().setProvider;
    const setModel = useCLISessionStore.getState().setModel;
    const updateTaskRunnerStatus = useTaskRunnerStore.getState().updateTaskStatus;

    const assignments = autoAssignTasks({
      requirements: selectedReqs,
      ideasMap: columnIdeasMap,
      sessions,
      config,
      getRequirementId,
      contextsMap,
    });

    // Execute assignments
    for (const assignment of assignments) {
      // Set provider/model override if specified
      if (assignment.providerOverride) {
        setProvider(assignment.sessionId, assignment.providerOverride);
        clearSessionStrategy(assignment.sessionId);
      }
      if (assignment.modelOverride !== undefined) {
        setModel(assignment.sessionId, assignment.modelOverride);
      }

      // Add tasks to session queue
      addTasksToSession(assignment.sessionId, assignment.tasks);

      // Sync queued status to TaskRunner store so TaskColumn shows correct status
      for (const task of assignment.tasks) {
        updateTaskRunnerStatus(task.id, createQueuedStatus());
        // Fan-out: mark consolidated constituent requirements as queued too
        if (task.consolidatedFrom) {
          for (const constituentId of task.consolidatedFrom) {
            updateTaskRunnerStatus(constituentId, createQueuedStatus());
          }
        }
      }
    }

    // Clear selection for assigned tasks
    if (assignments.length > 0) {
      actions.setSelectedRequirements(new Set());
    }
  }, [getRequirementId, actions, contextsMap]);

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
            totalCount={requirements.length}
            processedCount={processedCount}
            isRunning={isRunning}
            error={error}
            requirements={requirements}
            selectedRequirements={selectedRequirements}
            actions={actions}
            getRequirementId={getRequirementId}
            conductorQACount={conductorQACount}
          />
        </LazyContentSection>

        {/* Conductor Compact Cards — always visible with empty state + quick-start */}
        <LazyContentSection delay={0.1}>
          <ConductorRow runs={conductorRuns} onRunStarted={refreshConductor} />
        </LazyContentSection>

        {/* Requirements Grid - Column Layout */}
        <LazyContentSection delay={0.2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* External Requirements Column (Supabase) — always first */}
            <ExternalRequirementsColumn
              projectId={activeProject?.id ?? null}
              projectPath={activeProject?.path ?? null}
            />

            {requirements.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-sm">
                  No local requirements. Create them in your projects&apos; .claude/commands directory.
                </p>
              </div>
            ) : (
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
                      onToggleContextSelection={toggleContextSelection}
                      getRequirementId={getRequirementId}
                      onRefresh={() => refreshProjectRequirements(projectId, projectPath)}
                      aggregationData={aggregationByProject[projectId]}
                      ideasData={ideasMap}
                      contextsData={contextsMap}
                      onAutoAssign={handleAutoAssign}
                    />
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </LazyContentSection>
      </div>

    </div>
  );
};

export default React.memo(TaskRunnerLayout);

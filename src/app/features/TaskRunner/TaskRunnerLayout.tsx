'use client';
import React, { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Terminal } from 'lucide-react';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import ExternalRequirementsColumn from '@/app/features/TaskRunner/components/ExternalRequirementsColumn';
import { ConductorRow } from '@/app/features/TaskRunner/components/ConductorRow';
import { SessionSidebar } from '@/app/features/TaskRunner/components/SessionSidebar';
import { CLISessionModal } from '@/app/features/TaskRunner/components/CLISessionModal';
import { useConductorSync } from '@/app/features/TaskRunner/hooks/useConductorSync';
import { usePollingCleanupOnUnmount } from '@/app/features/TaskRunner/lib/pollingManager';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import { useRequirements } from '@/app/features/TaskRunner/hooks/useRequirements';
import { useTaskRunnerBatchData } from '@/app/features/TaskRunner/hooks/useTaskRunnerBatchData';
import { useActiveProjectStore } from '@/stores/clientProjectStore';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { useManualSessionStore } from '@/app/features/TaskRunner/store/manualSessionStore';
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

  // Session sidebar + modal state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const selectSession = useManualSessionStore((s) => s.selectSession);
  const manualSessionCount = useManualSessionStore(
    (s) => Object.keys(s.sessions).length,
  );
  const hasWaitingSession = useManualSessionStore(
    (s) => Object.values(s.sessions).some((sess) => sess.status === 'waiting_input'),
  );

  const handleSelectSession = useCallback((sessionId: string, isManual: boolean) => {
    if (isManual) {
      selectSession(sessionId);
      setModalOpen(true);
    }
  }, [selectSession]);

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
    const batchUpdate = useTaskRunnerStore.getState().batchUpdateTaskStatuses;

    const assignments = autoAssignTasks({
      requirements: selectedReqs,
      ideasMap: columnIdeasMap,
      sessions,
      config,
      getRequirementId,
      contextsMap,
    });

    // Execute assignments
    const statusUpdates: Array<{ taskId: string; status: ReturnType<typeof createQueuedStatus> }> = [];

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

      // Collect all status updates for a single batched store set()
      for (const task of assignment.tasks) {
        statusUpdates.push({ taskId: task.id, status: createQueuedStatus() });
        if (task.consolidatedFrom) {
          for (const constituentId of task.consolidatedFrom) {
            statusUpdates.push({ taskId: constituentId, status: createQueuedStatus() });
          }
        }
      }
    }

    // Apply all status changes in one atomic set() call
    if (statusUpdates.length > 0) {
      batchUpdate(statusUpdates);
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
    <div className="min-h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex">
      {/* Session sidebar */}
      <SessionSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={handleSelectSession}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 p-8">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[1600px] mx-auto space-y-8">
          {/* Header */}
          <LazyContentSection delay={0.05}>
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
          <LazyContentSection delay={0.18}>
            <ConductorRow runs={conductorRuns} onRunStarted={refreshConductor} />
          </LazyContentSection>

          {/* Requirements Grid - Column Layout */}
          <LazyContentSection delay={0.35}>
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

      {/* Sidebar toggle button (floating) */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className={`
          fixed bottom-6 left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full
          shadow-lg shadow-black/20 border transition-all
          ${sidebarOpen
            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
            : 'bg-gray-800 border-gray-700/50 text-gray-400 hover:text-purple-300 hover:border-purple-500/30'
          }
        `}
        title={sidebarOpen ? 'Close sessions panel' : 'Open sessions panel'}
      >
        <Terminal className="w-4 h-4" />
        {manualSessionCount > 0 && (
          <span className="text-xs font-medium">{manualSessionCount}</span>
        )}
        {hasWaitingSession && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* CLI session modal */}
      <CLISessionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default React.memo(TaskRunnerLayout);

'use client';
import React, { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, ListChecks } from 'lucide-react';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import ExternalRequirementsColumn from '@/app/features/TaskRunner/components/ExternalRequirementsColumn';
import { SessionSidebar } from '@/app/features/TaskRunner/components/SessionSidebar';
import { CLISessionModal } from '@/app/features/TaskRunner/components/CLISessionModal';
import { AutomatedSessionModal } from '@/app/features/TaskRunner/components/AutomatedSessionModal';
import { ViewToggle, type TaskRunnerView } from '@/app/features/TaskRunner/components/ViewToggle';
import TaskKanbanBoard from '@/app/features/TaskRunner/components/TaskKanbanBoard';
import type { CLISessionId } from '@/components/cli/store/cliSessionStore';
import { usePollingCleanupOnUnmount } from '@/app/features/TaskRunner/lib/pollingManager';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import TaskRunnerEmptyState from '@/app/features/TaskRunner/components/TaskRunnerEmptyState';
import FleetAutopilotBanner from '@/app/features/TaskRunner/components/FleetAutopilotBanner';
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
import type { DbIdea } from '@/app/db/models/types';

const TaskRunnerFullView = () => {
  // Cleanup all SSE/polling connections when unmounting (including when toggling
  // into nerd mode — full view unmounts, polling stops, ambient mode is stale).
  usePollingCleanupOnUnmount();

  // View mode toggle
  const [viewMode, setViewMode] = useState<TaskRunnerView>('grid');

  // Active project for external requirements column
  const activeProject = useActiveProjectStore((s) => s.activeProject);

  // Session sidebar + modal state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [selectedAutoSessionId, setSelectedAutoSessionId] = useState<CLISessionId | null>(null);
  const selectSession = useManualSessionStore((s) => s.selectSession);
  const manualSessionCount = useManualSessionStore(
    (s) => Object.keys(s.sessions).length,
  );
  const hasWaitingSession = useManualSessionStore(
    (s) => Object.values(s.sessions).some((sess) => sess.status === 'waiting_input' || sess.status === 'waiting_approval'),
  );

  const handleSelectSession = useCallback((sessionId: string, isManual: boolean) => {
    if (isManual) {
      selectSession(sessionId);
      setModalOpen(true);
    } else {
      setSelectedAutoSessionId(sessionId as CLISessionId);
      setAutoModalOpen(true);
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
        setModel(
          assignment.sessionId,
          assignment.providerOverride === 'codex' && assignment.modelOverride === null
            ? 'gpt-5.5'
            : assignment.modelOverride
        );
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
              manualSessionCount={manualSessionCount}
              hasWaitingSession={hasWaitingSession}
              onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
              sidebarOpen={sidebarOpen}
            />
          </LazyContentSection>

          {/* Fleet autopilot pause banner (rate-limit hold) */}
          <FleetAutopilotBanner />

          {/* View Toggle */}
          <div className="flex justify-end">
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>

          {/* Requirements — Grid or Kanban */}
          <LazyContentSection delay={0.35}>
            {viewMode === 'kanban' ? (
              <TaskKanbanBoard
                requirements={requirements}
                selectedRequirements={selectedRequirements}
                getRequirementId={getRequirementId}
                onToggleSelect={toggleSelection}
                onDelete={handleDelete}
                onReset={handleReset}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* External Requirements Column (Supabase) — always first */}
                <ExternalRequirementsColumn
                  projectId={activeProject?.id ?? null}
                  projectPath={activeProject?.path ?? null}
                />

                {requirements.length === 0 ? (
                  <div className="col-span-full">
                    <TaskRunnerEmptyState
                      icon={ListChecks}
                      title="No local requirements"
                      subtitle="Create them in your project's .claude/commands directory"
                    />
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
            )}
          </LazyContentSection>
        </div>
      </div>

      {/* CLI session modal */}
      <CLISessionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <AutomatedSessionModal
        sessionId={selectedAutoSessionId}
        isOpen={autoModalOpen}
        onClose={() => setAutoModalOpen(false)}
      />
    </div>
  );
};

export default React.memo(TaskRunnerFullView);

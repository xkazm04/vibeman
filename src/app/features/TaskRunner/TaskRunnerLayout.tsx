'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, RefreshCw, FileText } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { ToolbarAction } from '@/components/ui/ProjectToolbar';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import { loadRequirements, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from '@/app/features/TaskRunner/lib/types';
import {
  taskStatusToLegacy,
  isTaskRunning,
  isTaskQueued,
  isRequirementRunning,
  isRequirementQueued,
  isRequirementCompleted,
} from '@/app/features/TaskRunner/lib/types';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import ClaudeLogViewer from '@/app/Claude/ClaudeLogViewer';



const TaskRunnerLayout = () => {
  const { projects, initializeProjects } = useProjectConfigStore();
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const { showFullScreenModal } = useGlobalModal();

  // Get store tasks to sync status
  const storeTasks = useTaskRunnerStore((state) => state.tasks);

  const actions: TaskRunnerActions = {
    setRequirements,
    setSelectedRequirements,
    setIsRunning,
    setProcessedCount,
    setError,
  };

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load requirements from all projects
  useEffect(() => {
    const loadAllRequirements = async () => {
      // CRITICAL: Don't reload requirements while a batch is running
      // This would wipe out status information for queued/running tasks
      if (isRunning) {
        return;
      }

      setIsLoading(true);
      const allRequirements: ProjectRequirement[] = [];

      for (const project of projects) {
        try {
          const reqNames = await loadRequirements(project.path);
          // Filter out system requirements
          const filtered = reqNames.filter(
            (name) => name !== 'scan-contexts' && name !== 'structure-rules'
          );

          filtered.forEach((reqName) => {
            allRequirements.push({
              projectId: project.id,
              projectName: project.name,
              projectPath: project.path,
              requirementName: reqName,
              status: 'idle',
            });
          });
        } catch (error) {
          // Failed to load requirements for project
        }
      }

      setRequirements(allRequirements);
      setIsLoading(false);
    };

    if (projects.length > 0) {
      loadAllRequirements();
    }
  }, [projects, isRunning]);

  // Helper to get requirement ID
  const getRequirementId = (req: ProjectRequirement) =>
    `${req.projectId}:${req.requirementName}`;

  // Merge requirements with store task status for real-time updates
  const requirementsWithStatus = useMemo((): ProjectRequirement[] => {
    return requirements.map((req) => {
      const reqId = getRequirementId(req);
      const task = storeTasks[reqId];

      // If task exists in store, convert discriminated union to legacy string status
      if (task) {
        return {
          ...req,
          status: taskStatusToLegacy(task.status),
        };
      }

      return req;
    });
  }, [requirements, storeTasks]);

  // Group requirements by project (using status-merged requirements)
  const groupedRequirements = useMemo(() => {
    const grouped: Record<string, ProjectRequirement[]> = {};

    requirementsWithStatus.forEach((req) => {
      if (!grouped[req.projectId]) {
        grouped[req.projectId] = [];
      }
      grouped[req.projectId].push(req);
    });

    return grouped;
  }, [requirementsWithStatus]);

  const toggleSelection = (reqId: string) => {
    const req = requirementsWithStatus.find((r) => getRequirementId(r) === reqId);
    if (!req || isRequirementRunning(req.status) || isRequirementQueued(req.status)) return;

    setSelectedRequirements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reqId)) {
        newSet.delete(reqId);
      } else {
        newSet.add(reqId);
      }
      return newSet;
    });
  };

  const toggleProjectSelection = (projectId: string) => {
    const projectReqs = groupedRequirements[projectId] || [];
    const selectableReqs = projectReqs.filter(
      (req) => !isRequirementRunning(req.status) && !isRequirementQueued(req.status)
    );

    // Check if all selectable requirements are selected
    const allSelected = selectableReqs.every((req) =>
      selectedRequirements.has(getRequirementId(req))
    );

    setSelectedRequirements((prev) => {
      const newSet = new Set(prev);

      if (allSelected) {
        // Deselect all
        selectableReqs.forEach((req) => {
          newSet.delete(getRequirementId(req));
        });
      } else {
        // Select all
        selectableReqs.forEach((req) => {
          newSet.add(getRequirementId(req));
        });
      }

      return newSet;
    });
  };

  const handleDelete = async (reqId: string) => {
    const req = requirements.find((r) => getRequirementId(r) === reqId);
    if (!req) return;

    try {
      const success = await deleteRequirement(req.projectPath, req.requirementName);
      if (success) {
        setRequirements((prev) => prev.filter((r) => getRequirementId(r) !== reqId));
        setSelectedRequirements((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reqId);
          return newSet;
        });
      }
    } catch (error) {
      // Failed to delete requirement
    }
  };

  const handleBulkDelete = async (reqIds: string[]) => {
    if (reqIds.length === 0) return;

    // Confirmation dialog for bulk delete (3+ items)
    if (reqIds.length > 3) {
      const confirmed = window.confirm(
        `Delete ${reqIds.length} requirements? This cannot be undone.`
      );
      if (!confirmed) return;
    }

    // Delete each requirement
    const results = await Promise.allSettled(
      reqIds.map(async (reqId) => {
        const req = requirements.find((r) => getRequirementId(r) === reqId);
        if (!req) return { success: false, reqId };

        try {
          const success = await deleteRequirement(req.projectPath, req.requirementName);
          return { success, reqId };
        } catch {
          return { success: false, reqId };
        }
      })
    );

    // Get successfully deleted IDs
    const deletedIds = results
      .filter(
        (r): r is PromiseFulfilledResult<{ success: boolean; reqId: string }> =>
          r.status === 'fulfilled' && r.value.success
      )
      .map((r) => r.value.reqId);

    // Update state with successful deletions
    if (deletedIds.length > 0) {
      setRequirements((prev) =>
        prev.filter((r) => !deletedIds.includes(getRequirementId(r)))
      );

      setSelectedRequirements((prev) => {
        const newSet = new Set(prev);
        deletedIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Open Claude Log Viewer
  const handleOpenLogViewer = () => {
    // Get the first requirement with logs (or most recently run)
    // For now, use the first completed requirement
    const completedReq = requirementsWithStatus.find(req => isRequirementCompleted(req.status));
    const logRequirement = completedReq || requirementsWithStatus[0];

    if (logRequirement) {
      const logFilePath = `${logRequirement.projectPath}/.claude/logs/${logRequirement.requirementName}.log`;

      showFullScreenModal(
        'Claude Execution Logs',
        <ClaudeLogViewer
          logFilePath={logFilePath}
          requirementName={logRequirement.requirementName}
        />,
        {
          icon: FileText,
          iconBgColor: 'from-purple-600/20 to-pink-600/20',
          iconColor: 'text-purple-400',
          maxWidth: 'max-w-6xl',
          maxHeight: 'max-h-[90vh]',
        }
      );
    }
  };

  // Toolbar actions
  const toolbarActions: ToolbarAction[] = useMemo(() => [
    {
      icon: RefreshCw,
      label: 'Refresh requirements',
      onClick: () => {
        setRequirements([]);
        setSelectedRequirements(new Set());
      },
      colorScheme: 'green',
      tooltip: 'Reload all requirements',
      disabled: isRunning,
    },
  ], [isRunning]);

  if (isLoading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      onBulkDelete={handleBulkDelete}
                      onToggleProjectSelection={toggleProjectSelection}
                      getRequirementId={getRequirementId}
                      onRefresh={() => {
                        // Trigger a refresh by clearing requirements
                        setRequirements([]);
                        setSelectedRequirements(new Set());
                      }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </LazyContentSection>
      </div>

      {/* Floating Log Viewer Button */}
      {requirementsWithStatus.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleOpenLogViewer}
          data-testid="claude-log-viewer-button"
          className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-br from-purple-600/90 to-pink-600/90 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-2xl shadow-purple-500/30 border border-purple-400/30 backdrop-blur-sm transition-all group"
          title="View Claude Execution Logs"
        >
          <FileText className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />

          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
        </motion.button>
      )}
    </div>
  );
};

export default React.memo(TaskRunnerLayout);

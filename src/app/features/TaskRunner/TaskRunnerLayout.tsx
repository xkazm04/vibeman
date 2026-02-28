'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import { loadRequirements, loadRequirementsBatch, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from '@/app/features/TaskRunner/lib/types';
import {
  createIdleStatus,
  isTaskRunning,
  isTaskQueued,
} from '@/app/features/TaskRunner/lib/types';
import { usePollingCleanupOnUnmount } from '@/app/features/TaskRunner/lib/pollingManager';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store';
import { useShallow } from 'zustand/react/shallow';



const TaskRunnerLayout = () => {
  // Cleanup all SSE/polling connections when navigating away from TaskRunner
  usePollingCleanupOnUnmount();

  const { projects, initializeProjects } = useProjectConfigStore();
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | undefined>();
  // Get store tasks to sync status (useShallow prevents re-renders when unrelated task properties change)
  const storeTasks = useTaskRunnerStore(useShallow((state) => state.tasks));

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

  // Load requirements from all projects in a single batch request
  useEffect(() => {
    const loadAllRequirements = async () => {
      setIsLoading(true);

      try {
        // Single batch request for all projects
        const requirementsMap = await loadRequirementsBatch(
          projects.map(p => ({ id: p.id, path: p.path }))
        );

        const allRequirements: ProjectRequirement[] = [];

        for (const project of projects) {
          const reqNames = requirementsMap[project.id] || [];
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
              status: createIdleStatus(),
            });
          });
        }

        setRequirements(allRequirements);
      } catch (error) {
        // Failed to load requirements
        console.error('Failed to load requirements:', error);
      }

      setIsLoading(false);
    };

    if (projects.length > 0) {
      loadAllRequirements();
    }
  }, [projects]);

  // Helper to get requirement ID
  const getRequirementId = (req: ProjectRequirement) =>
    `${req.projectId}:${req.requirementName}`;

  // Merge requirements with store task status for real-time updates
  const requirementsWithStatus = useMemo((): ProjectRequirement[] => {
    return requirements.map((req) => {
      const reqId = getRequirementId(req);
      const task = storeTasks[reqId];

      // If task exists in store, use its canonical TaskStatusUnion directly
      if (task) {
        return {
          ...req,
          status: task.status,
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
    if (!req || isTaskRunning(req.status) || isTaskQueued(req.status)) return;

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
      (req) => !isTaskRunning(req.status) && !isTaskQueued(req.status)
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

  // Reset task status to idle (remove from store)
  const handleReset = (reqId: string) => {
    useTaskRunnerStore.setState((state) => {
      const newTasks = { ...state.tasks };
      delete newTasks[reqId];
      return { tasks: newTasks };
    });
  };

  const handleBulkDelete = async (reqIds: string[]) => {
    if (reqIds.length === 0) return;

    // Delete each requirement with concurrency limit to prevent overwhelming filesystem
    // Uses batched execution: processes up to CONCURRENCY_LIMIT items at a time
    const CONCURRENCY_LIMIT = 5;
    const deletedIds: string[] = [];

    // Process in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < reqIds.length; i += CONCURRENCY_LIMIT) {
      const batch = reqIds.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.allSettled(
        batch.map(async (reqId) => {
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

      // Collect successfully deleted IDs from this batch
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.success) {
          deletedIds.push(r.value.reqId);
        }
      });
    }

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

  // Refresh requirements for a specific project only
  const refreshProjectRequirements = async (projectId: string, projectPath: string) => {
    try {
      const reqNames = await loadRequirements(projectPath);
      // Filter out system requirements
      const filtered = reqNames.filter(
        (name) => name !== 'scan-contexts' && name !== 'structure-rules'
      );

      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const newProjectReqs: ProjectRequirement[] = filtered.map((reqName) => ({
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path,
        requirementName: reqName,
        status: createIdleStatus(),
      }));

      // Update requirements: remove old ones for this project, add new ones
      setRequirements((prev) => {
        const otherProjectReqs = prev.filter((r) => r.projectId !== projectId);
        return [...otherProjectReqs, ...newProjectReqs];
      });

      // Clear selections for this project's old requirements
      setSelectedRequirements((prev) => {
        const newSet = new Set(prev);
        // Remove any selections that belong to this project
        prev.forEach((reqId) => {
          if (reqId.startsWith(`${projectId}:`)) {
            newSet.delete(reqId);
          }
        });
        return newSet;
      });
    } catch (error) {
      console.error('Failed to refresh project requirements:', error);
    }
  };

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

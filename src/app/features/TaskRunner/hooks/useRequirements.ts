/**
 * useRequirements Hook
 *
 * Encapsulates all requirement loading, batching, selection, deletion,
 * and refresh logic extracted from TaskRunnerLayout. The layout component
 * consumes this hook and focuses solely on rendering.
 *
 * Uses React Query for caching, dedup, and stale-while-revalidate.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { deleteRequirement, loadRequirements } from '@/app/Claude/lib/requirementApi';
import { useRequirementBatch, requirementKeys } from '@/lib/queries/requirementQueries';
import type { ProjectRequirement, TaskRunnerActions } from '@/app/features/TaskRunner/lib/types';
import {
  createIdleStatus,
  isTaskRunning,
  isTaskQueued,
} from '@/app/features/TaskRunner/lib/types';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store';

/** System requirement files that should be filtered out */
const SYSTEM_REQUIREMENTS = new Set(['scan-contexts', 'structure-rules']);

/** Max concurrent delete operations to prevent overwhelming the filesystem */
const DELETE_CONCURRENCY_LIMIT = 5;

/** Get composite requirement ID */
export function getRequirementId(req: ProjectRequirement): string {
  return `${req.projectId}:${req.requirementName}`;
}

export interface UseRequirementsReturn {
  /** All requirements (status merging happens at column level) */
  requirements: ProjectRequirement[];
  /** Requirements grouped by projectId */
  groupedRequirements: Record<string, ProjectRequirement[]>;
  /** Currently selected requirement IDs */
  selectedRequirements: Set<string>;
  /** Whether initial loading is in progress */
  isLoading: boolean;
  /** Whether batch execution is running */
  isRunning: boolean;
  /** Count of processed tasks */
  processedCount: number;
  /** Current error message */
  error: string | undefined;
  /** Actions object for TaskRunnerHeader compatibility */
  actions: TaskRunnerActions;
  /** Toggle selection of a single requirement */
  toggleSelection: (reqId: string) => void;
  /** Toggle selection of all requirements in a project */
  toggleProjectSelection: (projectId: string) => void;
  /** Delete a single requirement */
  handleDelete: (reqId: string) => Promise<void>;
  /** Reset a task status back to idle */
  handleReset: (reqId: string) => void;
  /** Bulk delete multiple requirements */
  handleBulkDelete: (reqIds: string[]) => Promise<void>;
  /** Refresh requirements for a specific project */
  refreshProjectRequirements: (projectId: string, projectPath: string) => Promise<void>;
  /** Get requirement ID helper */
  getRequirementId: (req: ProjectRequirement) => string;
}

export function useRequirements(): UseRequirementsReturn {
  const { projects, initializeProjects } = useServerProjectStore();
  const queryClient = useQueryClient();
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | undefined>();

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

  // Load requirements via React Query (replaces manual useEffect + cache)
  const projectInputs = useMemo(
    () => projects.map((p) => ({ id: p.id, path: p.path })),
    [projects]
  );
  const { data: requirementsMap, isLoading: isQueryLoading } = useRequirementBatch(projectInputs);

  // Sync React Query data into local state (preserves existing selection/status logic)
  useEffect(() => {
    if (!requirementsMap) return;

    const allRequirements: ProjectRequirement[] = [];

    for (const project of projects) {
      const reqNames = requirementsMap[project.id] || [];
      const filtered = reqNames.filter((name) => !SYSTEM_REQUIREMENTS.has(name));

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
  }, [requirementsMap, projects]);

  // Group requirements by project (no status merge — columns handle their own store subscriptions)
  const groupedRequirements = useMemo(() => {
    const grouped: Record<string, ProjectRequirement[]> = {};
    requirements.forEach((req) => {
      if (!grouped[req.projectId]) {
        grouped[req.projectId] = [];
      }
      grouped[req.projectId].push(req);
    });
    return grouped;
  }, [requirements]);

  const toggleSelection = useCallback(
    (reqId: string) => {
      // Read task status imperatively to avoid subscribing to the entire tasks object
      const taskState = useTaskRunnerStore.getState().tasks[reqId];
      const status = taskState?.status;
      if (status && (isTaskRunning(status) || isTaskQueued(status))) return;

      setSelectedRequirements((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(reqId)) {
          newSet.delete(reqId);
        } else {
          newSet.add(reqId);
        }
        return newSet;
      });
    },
    []
  );

  const toggleProjectSelection = useCallback(
    (projectId: string) => {
      const projectReqs = groupedRequirements[projectId] || [];
      const storeTasks = useTaskRunnerStore.getState().tasks;

      const selectableReqs = projectReqs.filter((req) => {
        const taskState = storeTasks[getRequirementId(req)];
        const status = taskState?.status;
        return !status || (!isTaskRunning(status) && !isTaskQueued(status));
      });

      const allSelected = selectableReqs.every((req) =>
        selectedRequirements.has(getRequirementId(req))
      );

      setSelectedRequirements((prev) => {
        const newSet = new Set(prev);
        if (allSelected) {
          selectableReqs.forEach((req) => newSet.delete(getRequirementId(req)));
        } else {
          selectableReqs.forEach((req) => newSet.add(getRequirementId(req)));
        }
        return newSet;
      });
    },
    [groupedRequirements, selectedRequirements]
  );

  const handleDelete = useCallback(
    async (reqId: string) => {
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
          // Invalidate React Query cache so next refetch picks up the deletion
          queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
        }
      } catch {
        // Failed to delete requirement
      }
    },
    [requirements, queryClient]
  );

  const handleReset = useCallback((reqId: string) => {
    useTaskRunnerStore.setState((state) => {
      const newTasks = { ...state.tasks };
      delete newTasks[reqId];
      return { tasks: newTasks };
    });
  }, []);

  const handleBulkDelete = useCallback(
    async (reqIds: string[]) => {
      if (reqIds.length === 0) return;

      const deletedIds: string[] = [];

      for (let i = 0; i < reqIds.length; i += DELETE_CONCURRENCY_LIMIT) {
        const batch = reqIds.slice(i, i + DELETE_CONCURRENCY_LIMIT);

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

        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value.success) {
            deletedIds.push(r.value.reqId);
          }
        });
      }

      if (deletedIds.length > 0) {
        setRequirements((prev) =>
          prev.filter((r) => !deletedIds.includes(getRequirementId(r)))
        );
        setSelectedRequirements((prev) => {
          const newSet = new Set(prev);
          deletedIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
        queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
      }
    },
    [requirements, queryClient]
  );

  const refreshProjectRequirements = useCallback(
    async (projectId: string, projectPath: string) => {
      try {
        const reqNames = await loadRequirements(projectPath);
        const filtered = reqNames.filter((name) => !SYSTEM_REQUIREMENTS.has(name));

        const project = projects.find((p) => p.id === projectId);
        if (!project) return;

        const newProjectReqs: ProjectRequirement[] = filtered.map((reqName) => ({
          projectId: project.id,
          projectName: project.name,
          projectPath: project.path,
          requirementName: reqName,
          status: createIdleStatus(),
        }));

        setRequirements((prev) => {
          const otherProjectReqs = prev.filter((r) => r.projectId !== projectId);
          return [...otherProjectReqs, ...newProjectReqs];
        });

        setSelectedRequirements((prev) => {
          const newSet = new Set(prev);
          prev.forEach((reqId) => {
            if (reqId.startsWith(`${projectId}:`)) {
              newSet.delete(reqId);
            }
          });
          return newSet;
        });

        // Also invalidate batch cache so it stays consistent
        queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
      } catch (err) {
        console.error('Failed to refresh project requirements:', err);
      }
    },
    [projects, queryClient]
  );

  return {
    requirements,
    groupedRequirements,
    selectedRequirements,
    isLoading: isQueryLoading,
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
  };
}

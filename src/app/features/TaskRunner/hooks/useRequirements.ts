/**
 * useRequirements Hook
 *
 * Encapsulates all requirement loading, batching, selection, deletion,
 * and refresh logic extracted from TaskRunnerLayout. The layout component
 * consumes this hook and focuses solely on rendering.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { loadRequirements, loadRequirementsBatch, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from '@/app/features/TaskRunner/lib/types';
import {
  createIdleStatus,
  isTaskRunning,
  isTaskQueued,
} from '@/app/features/TaskRunner/lib/types';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store';
import { useShallow } from 'zustand/react/shallow';

/** System requirement files that should be filtered out */
const SYSTEM_REQUIREMENTS = new Set(['scan-contexts', 'structure-rules']);

/** Max concurrent delete operations to prevent overwhelming the filesystem */
const DELETE_CONCURRENCY_LIMIT = 5;

/** Get composite requirement ID */
export function getRequirementId(req: ProjectRequirement): string {
  return `${req.projectId}:${req.requirementName}`;
}

export interface UseRequirementsReturn {
  /** All requirements merged with store task status */
  requirementsWithStatus: ProjectRequirement[];
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
  const { projects, initializeProjects } = useProjectConfigStore();
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | undefined>();

  // Get store tasks for status sync (useShallow prevents re-renders on unrelated changes)
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
        const requirementsMap = await loadRequirementsBatch(
          projects.map((p) => ({ id: p.id, path: p.path }))
        );

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
      } catch (err) {
        console.error('Failed to load requirements:', err);
      }

      setIsLoading(false);
    };

    if (projects.length > 0) {
      loadAllRequirements();
    }
  }, [projects]);

  // Merge requirements with store task status for real-time updates
  const requirementsWithStatus = useMemo((): ProjectRequirement[] => {
    return requirements.map((req) => {
      const reqId = getRequirementId(req);
      const task = storeTasks[reqId];
      if (task) {
        return { ...req, status: task.status };
      }
      return req;
    });
  }, [requirements, storeTasks]);

  // Group requirements by project
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

  const toggleSelection = useCallback(
    (reqId: string) => {
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
    },
    [requirementsWithStatus]
  );

  const toggleProjectSelection = useCallback(
    (projectId: string) => {
      const projectReqs = groupedRequirements[projectId] || [];
      const selectableReqs = projectReqs.filter(
        (req) => !isTaskRunning(req.status) && !isTaskQueued(req.status)
      );

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
        }
      } catch {
        // Failed to delete requirement
      }
    },
    [requirements]
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
      }
    },
    [requirements]
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
      } catch (err) {
        console.error('Failed to refresh project requirements:', err);
      }
    },
    [projects]
  );

  return {
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
  };
}

'use client';

import { useState, useCallback, useRef } from 'react';
import { useBrainStore } from '@/stores/brainStore';

/**
 * Unified hook for triggering reflections with consistent feedback and deduplication.
 *
 * Prevents race conditions by maintaining a local running guard that blocks
 * concurrent triggers from multiple UI entry points (ReflectionStatus, InsightsPanel, etc.).
 *
 * @example Project-scoped reflection
 * const { trigger, status, error } = useReflectionTrigger({
 *   scope: 'project',
 *   projectId: 'abc-123',
 *   projectName: 'My Project',
 *   projectPath: '/path/to/project'
 * });
 *
 * @example Global reflection
 * const { trigger, status, error } = useReflectionTrigger({
 *   scope: 'global',
 *   projects: [{ id: '1', name: 'P1', path: '/p1' }],
 *   workspacePath: '/workspace'
 * });
 */

export type ReflectionTriggerScope = 'project' | 'global';

export interface ProjectConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
}

export interface GlobalConfig {
  projects: Array<{ id: string; name: string; path: string }>;
  workspacePath: string;
}

export interface UseReflectionTriggerOptions {
  scope: ReflectionTriggerScope;
  /** Project configuration (required for project scope) */
  project?: ProjectConfig;
  /** Global configuration (required for global scope) */
  global?: GlobalConfig;
  /** Optional callback on successful trigger */
  onSuccess?: () => void;
  /** Optional callback on error */
  onError?: (error: string) => void;
}

export interface UseReflectionTriggerReturn {
  /** Current trigger status: 'idle' | 'triggering' | 'running' | 'completed' | 'failed' */
  status: 'idle' | 'triggering' | 'running' | 'completed' | 'failed';
  /** Trigger the reflection (no-op if already running) */
  trigger: () => Promise<void>;
  /** Last error message if any */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
  /** Is currently triggering or running */
  isActive: boolean;
}

/**
 * Unified reflection trigger hook with deduplication and consistent feedback.
 */
export function useReflectionTrigger(
  options: UseReflectionTriggerOptions
): UseReflectionTriggerReturn {
  const { scope, project, global, onSuccess, onError } = options;

  const {
    reflectionStatus: projectStatus,
    globalReflectionStatus,
    triggerReflection,
    triggerGlobalReflection,
  } = useBrainStore();

  const [isTriggering, setIsTriggering] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const triggerLockRef = useRef(false);

  // Select status based on scope
  const reflectionStatus = scope === 'global' ? globalReflectionStatus : projectStatus;

  // Compute derived status
  const status = isTriggering
    ? 'triggering'
    : reflectionStatus === 'running'
    ? 'running'
    : reflectionStatus === 'completed'
    ? 'completed'
    : reflectionStatus === 'failed'
    ? 'failed'
    : 'idle';

  const isActive = isTriggering || reflectionStatus === 'running';

  /**
   * Trigger reflection with deduplication guard.
   */
  const trigger = useCallback(async () => {
    // Guard: prevent duplicate triggers
    if (triggerLockRef.current || isTriggering || reflectionStatus === 'running') {
      return;
    }

    // Validate required configuration
    if (scope === 'project') {
      if (!project?.projectId || !project?.projectName || !project?.projectPath) {
        const errorMsg = 'Missing required project configuration';
        setLocalError(errorMsg);
        onError?.(errorMsg);
        return;
      }
    } else if (scope === 'global') {
      if (!global?.projects || global.projects.length === 0) {
        const errorMsg = 'No projects provided for global reflection';
        setLocalError(errorMsg);
        onError?.(errorMsg);
        return;
      }
    }

    // Acquire lock
    triggerLockRef.current = true;
    setIsTriggering(true);
    setLocalError(null);

    try {
      if (scope === 'global') {
        const { projects, workspacePath } = global!;
        await triggerGlobalReflection(projects, workspacePath);
      } else {
        const { projectId, projectName, projectPath } = project!;
        await triggerReflection(projectId, projectName, projectPath);
      }

      // Success callback
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to trigger reflection';
      setLocalError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsTriggering(false);
      // Release lock after a brief delay to prevent rapid re-triggers
      setTimeout(() => {
        triggerLockRef.current = false;
      }, 500);
    }
  }, [
    scope,
    project,
    global,
    isTriggering,
    reflectionStatus,
    triggerReflection,
    triggerGlobalReflection,
    onSuccess,
    onError,
  ]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    status,
    trigger,
    error: localError,
    clearError,
    isActive,
  };
}

/**
 * Simplified hook for project-scoped reflection.
 */
export function useProjectReflectionTrigger(
  projectId: string | undefined,
  projectName: string | undefined,
  projectPath: string | undefined,
  callbacks?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }
): UseReflectionTriggerReturn {
  return useReflectionTrigger({
    scope: 'project',
    project:
      projectId && projectName && projectPath
        ? { projectId, projectName, projectPath }
        : undefined,
    onSuccess: callbacks?.onSuccess,
    onError: callbacks?.onError,
  });
}

/**
 * Simplified hook for global reflection.
 */
export function useGlobalReflectionTrigger(
  projects: Array<{ id: string; name: string; path: string }>,
  workspacePath: string,
  callbacks?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }
): UseReflectionTriggerReturn {
  return useReflectionTrigger({
    scope: 'global',
    global: { projects, workspacePath },
    onSuccess: callbacks?.onSuccess,
    onError: callbacks?.onError,
  });
}

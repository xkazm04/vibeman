/**
 * Application Session Hooks
 *
 * Custom hooks for accessing and manipulating the application session
 */

import { useCallback, useEffect } from 'react';
import { useApplicationSessionStore } from './coordinator';
import type { Project } from '@/types';
import type { Context } from '@/lib/queries/contextQueries';

/**
 * Hook to access current session state
 */
export function useApplicationSession() {
  const { activeProject, activeContext, activeWorkflow, phase, error, switchInProgress } = useApplicationSessionStore();
  return {
    activeProject,
    activeContext,
    activeWorkflow,
    phase,
    error,
    switchInProgress,
  };
}

/**
 * Hook to access session actions
 */
export function useSessionActions() {
  const { switchProject, setContext, setWorkflow, cancelAllRequests, setError, clearError, cleanup, initialize } = useApplicationSessionStore();
  return {
    switchProject,
    setContext,
    setWorkflow,
    cancelAllRequests,
    setError,
    clearError,
    cleanup,
    initialize,
  };
}

/**
 * Hook for accessing abort signals
 * Useful in data-fetching code
 */
export function useSessionAbortSignals() {
  const getAbortSignal = useApplicationSessionStore((state) => state.getAbortSignal);
  const cancelRequest = useApplicationSessionStore((state) => state.cancelRequest);

  return useCallback(
    (type: 'context' | 'brain' | 'brain_dashboard' | 'file_structure' | 'general') => ({
      signal: getAbortSignal(type),
      cancel: () => cancelRequest(type),
    }),
    [getAbortSignal, cancelRequest]
  );
}

/**
 * Hook for switching projects
 * Enhanced version of switchProject with better typing
 */
export function useSwitchProject() {
  const switchProject = useApplicationSessionStore((state) => state.switchProject);
  const setError = useApplicationSessionStore((state) => state.setError);

  return useCallback(
    async (project: Project) => {
      try {
        await switchProject(project);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to switch project');
        throw error;
      }
    },
    [switchProject, setError]
  );
}

/**
 * Hook for setting context
 */
export function useSetContext() {
  const setContext = useApplicationSessionStore((state) => state.setContext);
  const setError = useApplicationSessionStore((state) => state.setError);

  return useCallback(
    async (context: Context | null) => {
      try {
        await setContext(context);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to set context');
        throw error;
      }
    },
    [setContext, setError]
  );
}

/**
 * Hook to initialize session on app load
 */
export function useSessionInitialize() {
  useEffect(() => {
    useApplicationSessionStore.getState().initialize();
  }, []);
}

/**
 * Hook to check if a project is active
 */
export function useIsProjectActive(projectId: string | null | undefined): boolean {
  const activeProject = useApplicationSessionStore((state) => state.activeProject);
  return activeProject?.id === projectId;
}

/**
 * Hook to check if a context is active
 */
export function useIsContextActive(contextId: string | null | undefined): boolean {
  const activeContext = useApplicationSessionStore((state) => state.activeContext);
  return activeContext?.id === contextId;
}

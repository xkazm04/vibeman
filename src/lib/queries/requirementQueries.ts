/**
 * React Query hooks for Claude Code requirements.
 *
 * Replaces the manual requirementCache / inFlightRequests maps that were
 * previously in requirementApi.ts. React Query provides stale-while-revalidate,
 * automatic dedup of concurrent requests, and cache invalidation on mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loadRequirements,
  loadRequirementsBatch,
  deleteRequirement,
  saveRequirement,
} from '@/app/Claude/lib/requirementApi';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const requirementKeys = {
  all: ['requirements'] as const,
  lists: () => [...requirementKeys.all, 'list'] as const,
  list: (projectPath: string) => [...requirementKeys.lists(), projectPath] as const,
  batch: (projectIds: string[]) => [...requirementKeys.all, 'batch', ...projectIds.sort()] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch requirement names for a single project.
 * 30-second stale time mirrors the old manual cache TTL.
 */
export function useRequirementList(projectPath: string, enabled = true) {
  return useQuery({
    queryKey: requirementKeys.list(projectPath),
    queryFn: () => loadRequirements(projectPath),
    staleTime: 30_000,
    enabled: enabled && !!projectPath,
  });
}

/**
 * Fetch requirements for multiple projects in one batch request.
 */
export function useRequirementBatch(
  projects: Array<{ id: string; path: string }>,
  enabled = true,
) {
  const projectIds = projects.map((p) => p.id);
  return useQuery({
    queryKey: requirementKeys.batch(projectIds),
    queryFn: () => loadRequirementsBatch(projects),
    staleTime: 30_000,
    enabled: enabled && projects.length > 0,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Delete a requirement and invalidate the project's cache.
 */
export function useDeleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectPath, requirementName }: { projectPath: string; requirementName: string }) =>
      deleteRequirement(projectPath, requirementName),
    onSuccess: () => {
      // Invalidate all requirement lists so they refetch
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

/**
 * Save (create/update) a requirement and invalidate the project's cache.
 */
export function useSaveRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectPath, requirementName, content }: { projectPath: string; requirementName: string; content: string }) =>
      saveRequirement(projectPath, requirementName, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

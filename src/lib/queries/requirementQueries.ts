/**
 * React Query hooks for Claude Code requirements.
 *
 * Replaces the manual requirementCache / inFlightRequests maps that were
 * previously in requirementApi.ts. React Query provides stale-while-revalidate,
 * automatic dedup of concurrent requests, and cache invalidation on mutations.
 */

import { useQuery } from '@tanstack/react-query';
import {
  loadRequirementsBatch,
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


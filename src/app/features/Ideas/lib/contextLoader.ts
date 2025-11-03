/**
 * Context Loader Utility
 * Loads contexts for multiple projects to ensure context names are available
 */

import { Context } from '@/lib/queries/contextQueries';

/**
 * Fetch all contexts for a specific project
 */
export async function fetchContextsForProject(projectId: string): Promise<Context[]> {
  try {
    const response = await fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`);
    if (response.ok) {
      const data = await response.json();
      return data.data.contexts || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch contexts for multiple projects
 */
export async function fetchContextsForProjects(projectIds: string[]): Promise<Record<string, Context[]>> {
  const contextsMap: Record<string, Context[]> = {};

  await Promise.all(
    projectIds.map(async (projectId) => {
      const contexts = await fetchContextsForProject(projectId);
      contextsMap[projectId] = contexts;
    })
  );

  return contextsMap;
}

/**
 * Get context name from a map of contexts
 */
export function getContextNameFromMap(
  contextId: string,
  contextsMap: Record<string, Context[]>
): string {
  // Search through all projects' contexts
  for (const contexts of Object.values(contextsMap)) {
    const context = contexts.find(c => c.id === contextId);
    if (context) {
      return context.name;
    }
  }

  // Fallback: try to extract a readable name from the context ID
  // Context IDs are typically UUIDs, so just return a short version
  return contextId.substring(0, 8);
}

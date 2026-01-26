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
 * Get context name from a flat array of contexts
 */
export function getContextName(
  contextId: string,
  contexts: Array<{ id: string; name: string }>
): string {
  const context = contexts.find(c => c.id === contextId);
  if (context) {
    return context.name;
  }
  return contextId.substring(0, 8);
}

/**
 * Get context name from a map of contexts (keyed by project ID)
 */
export function getContextNameFromMap(
  contextId: string,
  contextsMap: Record<string, Context[]>
): string {
  for (const contexts of Object.values(contextsMap)) {
    const context = contexts.find(c => c.id === contextId);
    if (context) {
      return context.name;
    }
  }
  return contextId.substring(0, 8);
}

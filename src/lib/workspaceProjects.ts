/**
 * Shared utility for filtering projects by workspace.
 *
 * Centralizes the workspace scoping logic so that all consumers
 * apply identical rules. A workspace rule change (e.g. adding
 * workspace inheritance) becomes a single-file update.
 */

/**
 * Returns projects belonging to the given workspace.
 *
 * - `null` / `'default'` → returns only projects NOT assigned to any workspace (unassigned)
 * - any other workspace ID → returns only projects assigned to that workspace
 */
export function getWorkspaceProjects<T extends { id: string }>(
  allProjects: T[],
  workspaceId: string | null,
  workspaceProjectMap: Record<string, string[]>,
): T[] {
  if (!workspaceId || workspaceId === 'default') {
    const assignedIds = new Set(Object.values(workspaceProjectMap).flat());
    return allProjects.filter(p => !assignedIds.has(p.id));
  }
  const projectIds = workspaceProjectMap[workspaceId] || [];
  return allProjects.filter(p => projectIds.includes(p.id));
}

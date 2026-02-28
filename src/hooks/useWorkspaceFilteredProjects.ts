import { useMemo } from 'react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getWorkspaceProjects } from '@/lib/workspaceProjects';
import type { Project } from '@/types';

/**
 * Returns the list of projects filtered by the active workspace.
 *
 * - null or 'default' → only projects NOT assigned to any workspace (Unassigned)
 * - ws_xxx → only projects assigned to that workspace
 */
export function useWorkspaceFilteredProjects(): Project[] {
  const projects = useServerProjectStore(state => state.projects);
  const activeWorkspaceId = useWorkspaceStore(state => state.activeWorkspaceId);
  const workspaceProjectMap = useWorkspaceStore(state => state.workspaceProjectMap);

  return useMemo(
    () => getWorkspaceProjects(projects, activeWorkspaceId, workspaceProjectMap),
    [projects, activeWorkspaceId, workspaceProjectMap],
  );
}

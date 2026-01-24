import { useMemo } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useWorkspaceFilteredProjects } from './useWorkspaceFilteredProjects';

/**
 * Resolves the selectedProjectId for API calls, accounting for workspace scope.
 *
 * When a workspace is active and "All" is selected:
 *   - Returns comma-separated project IDs for that workspace
 *   - API routes with parseProjectIds() support will filter correctly
 *
 * When no workspace or a specific project is selected:
 *   - Returns the selectedProjectId unchanged
 */
export function useWorkspaceProjectId(): string {
  const selectedProjectId = useClientProjectStore(state => state.selectedProjectId);
  const activeWorkspaceId = useWorkspaceStore(state => state.activeWorkspaceId);
  const filteredProjects = useWorkspaceFilteredProjects();

  return useMemo(() => {
    // If a specific project is selected, return it unchanged
    if (selectedProjectId !== 'all') {
      return selectedProjectId;
    }

    // "All" selected → comma-separated IDs of current workspace's projects
    if (filteredProjects.length > 0) {
      return filteredProjects.map(p => p.id).join(',');
    }

    // Workspace has no projects, return 'all' as fallback
    return 'all';
  }, [selectedProjectId, activeWorkspaceId, filteredProjects]);
}

/**
 * Utility functions for ideas page
 */

import { DbIdea } from '@/app/db';

export interface GroupedIdeas {
  [projectId: string]: {
    [contextId: string]: DbIdea[];
  };
}

/**
 * Get project name from project ID
 */
export function getProjectName(
  projectId: string,
  projects: Array<{ id: string; name: string }>
): string {
  const project = projects.find(p => p.id === projectId);
  return project?.name || projectId;
}

/**
 * Group ideas by project and context
 */
export function groupIdeasByProjectAndContext(
  ideas: DbIdea[],
  filterStatus: string,
  filterProject: string
): GroupedIdeas {
  let filtered = ideas;

  // Filter by status
  if (filterStatus !== 'all') {
    filtered = filtered.filter(idea => idea.status === filterStatus);
  }

  // Filter by project
  if (filterProject !== 'all') {
    filtered = filtered.filter(idea => idea.project_id === filterProject);
  }

  const groups: GroupedIdeas = {};

  filtered.forEach(idea => {
    const projectKey = idea.project_id || 'unknown';
    const contextKey = idea.context_id || 'no-context';

    if (!groups[projectKey]) {
      groups[projectKey] = {};
    }
    if (!groups[projectKey][contextKey]) {
      groups[projectKey][contextKey] = [];
    }

    groups[projectKey][contextKey].push(idea);
  });

  return groups;
}

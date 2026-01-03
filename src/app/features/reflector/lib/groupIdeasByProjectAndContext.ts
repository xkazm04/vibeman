import { DbIdea } from '@/app/db';

export interface GroupedIdea extends DbIdea {
  projectName?: string;
  contextName?: string;
  contextColor?: string;
}

export interface ContextGroup {
  contextId: string | null;
  contextName: string;
  contextColor?: string;
  ideas: GroupedIdea[];
  count: number;
}

export interface ProjectGroup {
  projectId: string;
  projectName: string;
  contexts: ContextGroup[];
  totalIdeas: number;
}

export interface HierarchicalIdeaStructure {
  projects: ProjectGroup[];
  totalIdeas: number;
}

/**
 * Create lookup maps for efficient access
 */
function createLookupMaps<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

/**
 * Sort ideas by implemented date (descending)
 */
function sortIdeasByImplementedDate(ideas: GroupedIdea[]): GroupedIdea[] {
  return ideas.sort((a, b) => {
    const dateA = a.implemented_at ? new Date(a.implemented_at).getTime() : 0;
    const dateB = b.implemented_at ? new Date(b.implemented_at).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Sort by count (descending)
 */
function sortByCount<T extends { count: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.count - a.count);
}

/**
 * Groups ideas by project, then by context within each project
 * @param ideas Array of ideas to group
 * @param projects Array of projects for metadata lookup
 * @param contexts Array of contexts for metadata lookup
 */
export function groupIdeasByProjectAndContext(
  ideas: DbIdea[],
  projects: Array<{ id: string; name: string }> = [],
  contexts: Array<{ id: string; name: string; groupColor?: string }> = []
): HierarchicalIdeaStructure {
  // Create lookup maps for efficient access
  const projectMap = createLookupMaps(projects);
  const contextMap = createLookupMaps(contexts);

  // Group ideas by project first
  const projectGroups = new Map<string, Map<string | null, GroupedIdea[]>>();

  ideas.forEach(idea => {
    const projectId = idea.project_id;
    const contextId = idea.context_id;

    // Initialize project group if it doesn't exist
    if (!projectGroups.has(projectId)) {
      projectGroups.set(projectId, new Map());
    }

    const projectContexts = projectGroups.get(projectId)!;

    // Initialize context group if it doesn't exist
    if (!projectContexts.has(contextId)) {
      projectContexts.set(contextId, []);
    }

    // Enrich idea with metadata
    const enrichedIdea: GroupedIdea = {
      ...idea,
      projectName: projectMap.get(projectId)?.name,
      contextName: contextId ? contextMap.get(contextId)?.name : undefined,
      contextColor: contextId ? contextMap.get(contextId)?.groupColor : undefined,
    };

    projectContexts.get(contextId)!.push(enrichedIdea);
  });

  // Convert to hierarchical structure
  const projectsArray: ProjectGroup[] = [];

  projectGroups.forEach((contexts, projectId) => {
    const contextsArray: ContextGroup[] = [];
    let totalProjectIdeas = 0;

    contexts.forEach((ideas, contextId) => {
      const contextInfo = contextId ? contextMap.get(contextId) : null;

      contextsArray.push({
        contextId,
        contextName: contextInfo?.name || 'Uncategorized',
        contextColor: contextInfo?.groupColor,
        ideas: sortIdeasByImplementedDate(ideas),
        count: ideas.length,
      });

      totalProjectIdeas += ideas.length;
    });

    projectsArray.push({
      projectId,
      projectName: projectMap.get(projectId)?.name || 'Unknown Project',
      contexts: sortByCount(contextsArray),
      totalIdeas: totalProjectIdeas,
    });
  });

  return {
    projects: projectsArray.sort((a, b) => b.totalIdeas - a.totalIdeas),
    totalIdeas: ideas.length,
  };
}


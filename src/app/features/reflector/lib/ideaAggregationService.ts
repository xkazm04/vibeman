/**
 * Idea Aggregation Service
 * Handles data aggregation and statistics for the Total view dashboard
 * Efficiently retrieves and organizes all ideas with their associated project and context metadata
 */

import { DbIdea, ideaDb } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { Context } from '@/stores/contextStore';

/**
 * Enriched idea with metadata for display
 */
export interface IdeaWithMetadata extends DbIdea {
  projectName?: string;
  contextName?: string;
  contextColor?: string;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  projectId: string;
  projectName: string;
  totalIdeas: number;
  statusDistribution: {
    pending: number;
    accepted: number;
    rejected: number;
    implemented: number;
  };
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  averageScanMetrics: {
    effort: number | null;
    impact: number | null;
  };
}

/**
 * Context statistics across all projects
 */
export interface ContextStats {
  contextId: string;
  contextName: string;
  contextColor: string;
  projectId: string;
  projectName: string;
  ideaCount: number;
  statusDistribution: {
    pending: number;
    accepted: number;
    rejected: number;
    implemented: number;
  };
}

/**
 * Grouped ideas by project and context
 */
export interface GroupedIdeas {
  projectId: string;
  projectName: string;
  contexts: {
    contextId: string | null;
    contextName: string;
    contextColor?: string;
    ideas: IdeaWithMetadata[];
    count: number;
  }[];
  totalIdeas: number;
}

/**
 * Status distribution type - single source of truth for status counting
 */
export interface StatusDistribution {
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
}

/**
 * Create context lookup map
 */
function createContextMap(contexts: Context[]): Map<string, Context> {
  const contextMap = new Map<string, Context>();
  contexts.forEach(ctx => contextMap.set(ctx.id, ctx));
  return contextMap;
}

/**
 * Calculate status distribution for ideas - single source of truth
 * Use this function wherever status counts are needed to ensure consistency
 */
export function calculateStatusDistribution(ideas: DbIdea[]): StatusDistribution {
  const statusDistribution: StatusDistribution = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    implemented: 0,
  };

  ideas.forEach(idea => {
    statusDistribution[idea.status]++;
  });

  return statusDistribution;
}

/**
 * Fetch all ideas and enrich with project and context metadata
 */
export function getAllIdeasWithMetadata(
  contexts: Context[]
): IdeaWithMetadata[] {
  try {
    // Get all ideas from database
    const ideas = ideaDb.getAllIdeas();

    // Get project store for project names
    const projectStore = useProjectConfigStore.getState();

    // Create context lookup map for O(1) access
    const contextMap = createContextMap(contexts);

    // Enrich each idea with metadata
    const enrichedIdeas: IdeaWithMetadata[] = ideas.map(idea => {
      const project = projectStore.getProject(idea.project_id);
      const context = idea.context_id ? contextMap.get(idea.context_id) : null;

      return {
        ...idea,
        projectName: project?.name || 'Unknown Project',
        contextName: context?.name || (idea.context_id ? 'Unknown Context' : 'No Context'),
        contextColor: context?.groupColor,
      };
    });

    return enrichedIdeas;
  } catch (error) {
    return [];
  }
}

/**
 * Group ideas by project ID
 */
function groupIdeasByProject(ideas: DbIdea[]): Map<string, DbIdea[]> {
  const projectIdeasMap = new Map<string, DbIdea[]>();
  ideas.forEach(idea => {
    if (!projectIdeasMap.has(idea.project_id)) {
      projectIdeasMap.set(idea.project_id, []);
    }
    projectIdeasMap.get(idea.project_id)!.push(idea);
  });
  return projectIdeasMap;
}

/**
 * Calculate date range for ideas
 */
function calculateDateRange(ideas: DbIdea[]) {
  const dates = ideas
    .map(idea => new Date(idea.created_at).getTime())
    .filter(time => !isNaN(time));

  return {
    earliest: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
    latest: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
  };
}

/**
 * Calculate average metrics for ideas
 */
function calculateAverageMetrics(ideas: DbIdea[]) {
  const effortValues = ideas
    .map(idea => idea.effort)
    .filter((effort): effort is number => effort !== null);

  const impactValues = ideas
    .map(idea => idea.impact)
    .filter((impact): impact is number => impact !== null);

  return {
    effort: effortValues.length > 0
      ? effortValues.reduce((sum, val) => sum + val, 0) / effortValues.length
      : null,
    impact: impactValues.length > 0
      ? impactValues.reduce((sum, val) => sum + val, 0) / impactValues.length
      : null,
  };
}

/**
 * Calculate statistics per project
 */
export function getProjectStats(): ProjectStats[] {
  try {
    // Get all ideas
    const ideas = ideaDb.getAllIdeas();

    // Get project store
    const projectStore = useProjectConfigStore.getState();
    const projects = projectStore.getAllProjects();

    // Group ideas by project
    const projectIdeasMap = groupIdeasByProject(ideas);

    // Calculate stats for each project
    const stats: ProjectStats[] = projects.map(project => {
      const projectIdeas = projectIdeasMap.get(project.id) || [];

      return {
        projectId: project.id,
        projectName: project.name,
        totalIdeas: projectIdeas.length,
        statusDistribution: calculateStatusDistribution(projectIdeas),
        dateRange: calculateDateRange(projectIdeas),
        averageScanMetrics: calculateAverageMetrics(projectIdeas),
      };
    });

    // Sort by total ideas descending
    return stats.sort((a, b) => b.totalIdeas - a.totalIdeas);
  } catch (error) {
    return [];
  }
}

/**
 * Group ideas by context ID
 */
function groupIdeasByContext(ideas: DbIdea[]): Map<string, DbIdea[]> {
  const contextIdeasMap = new Map<string, DbIdea[]>();
  ideas.forEach(idea => {
    if (idea.context_id) {
      if (!contextIdeasMap.has(idea.context_id)) {
        contextIdeasMap.set(idea.context_id, []);
      }
      contextIdeasMap.get(idea.context_id)!.push(idea);
    }
  });
  return contextIdeasMap;
}

/**
 * Calculate context statistics across all projects
 */
export function getContextStats(contexts: Context[]): ContextStats[] {
  try {
    // Get all ideas
    const ideas = ideaDb.getAllIdeas();

    // Get project store
    const projectStore = useProjectConfigStore.getState();

    // Create context map for O(1) lookup
    const contextMap = createContextMap(contexts);

    // Group ideas by context
    const contextIdeasMap = groupIdeasByContext(ideas);

    // Calculate stats for each context
    const stats: ContextStats[] = [];

    contextIdeasMap.forEach((contextIdeas, contextId) => {
      const context = contextMap.get(contextId);

      // Skip if context not found
      if (!context) {
        return;
      }

      const project = projectStore.getProject(context.projectId);

      stats.push({
        contextId,
        contextName: context.name,
        contextColor: context.groupColor || '#8B5CF6',
        projectId: context.projectId,
        projectName: project?.name || 'Unknown Project',
        ideaCount: contextIdeas.length,
        statusDistribution: calculateStatusDistribution(contextIdeas),
      });
    });

    // Sort by idea count descending
    return stats.sort((a, b) => b.ideaCount - a.ideaCount);
  } catch (error) {
    return [];
  }
}

/**
 * Sort ideas by creation date (descending)
 */
function sortIdeasByDate(ideas: IdeaWithMetadata[]): IdeaWithMetadata[] {
  return ideas.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Group ideas by project and context for dashboard display
 */
export function getIdeasGroupedByProjectAndContext(
  contexts: Context[]
): GroupedIdeas[] {
  try {
    // Get enriched ideas
    const ideasWithMetadata = getAllIdeasWithMetadata(contexts);

    // Get project store
    const projectStore = useProjectConfigStore.getState();
    const projects = projectStore.getAllProjects();

    // Create context map for O(1) lookup
    const contextMap = createContextMap(contexts);

    // Group by project
    const grouped: GroupedIdeas[] = projects.map(project => {
      // Filter ideas for this project
      const projectIdeas = ideasWithMetadata.filter(
        idea => idea.project_id === project.id
      );

      // Group by context within project
      const contextGroups = new Map<string | null, IdeaWithMetadata[]>();
      projectIdeas.forEach(idea => {
        const contextKey = idea.context_id || null;
        if (!contextGroups.has(contextKey)) {
          contextGroups.set(contextKey, []);
        }
        contextGroups.get(contextKey)!.push(idea);
      });

      // Convert to array and sort
      const contextArray = Array.from(contextGroups.entries()).map(([contextId, ideas]) => {
        const context = contextId ? contextMap.get(contextId) : null;

        return {
          contextId,
          contextName: context?.name || (contextId ? 'Unknown Context' : 'No Context'),
          contextColor: context?.groupColor,
          ideas: sortIdeasByDate(ideas),
          count: ideas.length,
        };
      });

      // Sort contexts by idea count (descending)
      contextArray.sort((a, b) => b.count - a.count);

      return {
        projectId: project.id,
        projectName: project.name,
        contexts: contextArray,
        totalIdeas: projectIdeas.length,
      };
    });

    // Filter out projects with no ideas and sort by total ideas
    return grouped
      .filter(group => group.totalIdeas > 0)
      .sort((a, b) => b.totalIdeas - a.totalIdeas);
  } catch (error) {
    return [];
  }
}

/**
 * Get overall statistics summary
 */
export interface OverallStats {
  totalIdeas: number;
  totalProjects: number;
  totalContexts: number;
  statusDistribution: {
    pending: number;
    accepted: number;
    rejected: number;
    implemented: number;
  };
  topProjects: Array<{
    projectId: string;
    projectName: string;
    ideaCount: number;
  }>;
  topContexts: Array<{
    contextId: string;
    contextName: string;
    contextColor: string;
    ideaCount: number;
  }>;
}

export function getOverallStats(contexts: Context[]): OverallStats {
  try {
    const ideas = ideaDb.getAllIdeas();
    const projectStats = getProjectStats();
    const contextStats = getContextStats(contexts);

    // Top 3 projects
    const topProjects = projectStats
      .slice(0, 3)
      .map(stat => ({
        projectId: stat.projectId,
        projectName: stat.projectName,
        ideaCount: stat.totalIdeas,
      }));

    // Top 3 contexts
    const topContexts = contextStats
      .slice(0, 3)
      .map(stat => ({
        contextId: stat.contextId,
        contextName: stat.contextName,
        contextColor: stat.contextColor,
        ideaCount: stat.ideaCount,
      }));

    // Count unique contexts
    const uniqueContextIds = new Set(
      ideas.map(idea => idea.context_id).filter(id => id !== null)
    );

    return {
      totalIdeas: ideas.length,
      totalProjects: projectStats.filter(s => s.totalIdeas > 0).length,
      totalContexts: uniqueContextIds.size,
      statusDistribution: calculateStatusDistribution(ideas),
      topProjects,
      topContexts,
    };
  } catch (error) {
    return {
      totalIdeas: 0,
      totalProjects: 0,
      totalContexts: 0,
      statusDistribution: { pending: 0, accepted: 0, rejected: 0, implemented: 0 },
      topProjects: [],
      topContexts: [],
    };
  }
}

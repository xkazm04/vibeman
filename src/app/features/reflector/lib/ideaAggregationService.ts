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
    const contextMap = new Map<string, Context>();
    contexts.forEach(ctx => contextMap.set(ctx.id, ctx));

    // Enrich each idea with metadata
    const enrichedIdeas: IdeaWithMetadata[] = ideas.map(idea => {
      const project = projectStore.getProject(idea.project_id);
      const context = idea.context_id ? contextMap.get(idea.context_id) : null;

      // Log warning if project not found
      if (!project) {
        console.warn(`[ideaAggregationService] Project not found for idea ${idea.id}: project_id=${idea.project_id}`);
      }

      // Log warning if context_id is set but context not found
      if (idea.context_id && !context) {
        console.warn(`[ideaAggregationService] Context not found for idea ${idea.id}: context_id=${idea.context_id}`);
      }

      return {
        ...idea,
        projectName: project?.name || 'Unknown Project',
        contextName: context?.name || (idea.context_id ? 'Unknown Context' : 'No Context'),
        contextColor: context?.groupColor,
      };
    });

    return enrichedIdeas;
  } catch (error) {
    console.error('[ideaAggregationService] Error fetching ideas with metadata:', error);
    return [];
  }
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
    const projectIdeasMap = new Map<string, DbIdea[]>();
    ideas.forEach(idea => {
      if (!projectIdeasMap.has(idea.project_id)) {
        projectIdeasMap.set(idea.project_id, []);
      }
      projectIdeasMap.get(idea.project_id)!.push(idea);
    });

    // Calculate stats for each project
    const stats: ProjectStats[] = projects.map(project => {
      const projectIdeas = projectIdeasMap.get(project.id) || [];

      // Status distribution
      const statusDistribution = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        implemented: 0,
      };

      projectIdeas.forEach(idea => {
        statusDistribution[idea.status]++;
      });

      // Date range
      const dates = projectIdeas
        .map(idea => new Date(idea.created_at).getTime())
        .filter(time => !isNaN(time));

      const dateRange = {
        earliest: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
        latest: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
      };

      // Average scan metrics
      const effortValues = projectIdeas
        .map(idea => idea.effort)
        .filter((effort): effort is number => effort !== null);

      const impactValues = projectIdeas
        .map(idea => idea.impact)
        .filter((impact): impact is number => impact !== null);

      const averageScanMetrics = {
        effort: effortValues.length > 0
          ? effortValues.reduce((sum, val) => sum + val, 0) / effortValues.length
          : null,
        impact: impactValues.length > 0
          ? impactValues.reduce((sum, val) => sum + val, 0) / impactValues.length
          : null,
      };

      return {
        projectId: project.id,
        projectName: project.name,
        totalIdeas: projectIdeas.length,
        statusDistribution,
        dateRange,
        averageScanMetrics,
      };
    });

    // Sort by total ideas descending
    return stats.sort((a, b) => b.totalIdeas - a.totalIdeas);
  } catch (error) {
    console.error('[ideaAggregationService] Error calculating project stats:', error);
    return [];
  }
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
    const contextMap = new Map<string, Context>();
    contexts.forEach(ctx => contextMap.set(ctx.id, ctx));

    // Group ideas by context
    const contextIdeasMap = new Map<string, DbIdea[]>();
    ideas.forEach(idea => {
      if (idea.context_id) {
        if (!contextIdeasMap.has(idea.context_id)) {
          contextIdeasMap.set(idea.context_id, []);
        }
        contextIdeasMap.get(idea.context_id)!.push(idea);
      }
    });

    // Calculate stats for each context
    const stats: ContextStats[] = [];

    contextIdeasMap.forEach((contextIdeas, contextId) => {
      const context = contextMap.get(contextId);

      // Skip if context not found (log warning)
      if (!context) {
        console.warn(`[ideaAggregationService] Context not found for contextId=${contextId}, skipping stats`);
        return;
      }

      const project = projectStore.getProject(context.projectId);

      // Status distribution
      const statusDistribution = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        implemented: 0,
      };

      contextIdeas.forEach(idea => {
        statusDistribution[idea.status]++;
      });

      stats.push({
        contextId,
        contextName: context.name,
        contextColor: context.groupColor || '#8B5CF6',
        projectId: context.projectId,
        projectName: project?.name || 'Unknown Project',
        ideaCount: contextIdeas.length,
        statusDistribution,
      });
    });

    // Sort by idea count descending
    return stats.sort((a, b) => b.ideaCount - a.ideaCount);
  } catch (error) {
    console.error('[ideaAggregationService] Error calculating context stats:', error);
    return [];
  }
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
    const contextMap = new Map<string, Context>();
    contexts.forEach(ctx => contextMap.set(ctx.id, ctx));

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
          ideas: ideas.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
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
    console.error('[ideaAggregationService] Error grouping ideas:', error);
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

    // Status distribution
    const statusDistribution = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      implemented: 0,
    };

    ideas.forEach(idea => {
      statusDistribution[idea.status]++;
    });

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
      statusDistribution,
      topProjects,
      topContexts,
    };
  } catch (error) {
    console.error('[ideaAggregationService] Error calculating overall stats:', error);
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

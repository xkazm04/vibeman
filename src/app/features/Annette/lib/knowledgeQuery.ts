/**
 * Knowledge Query Service
 * Provides specialized queries for Annette voice assistant
 * Retrieves and formats project data for conversational responses
 */

import { goalDb, contextDb, contextGroupDb, backlogDb, ideaDb, implementationLogDb } from '@/app/db';

export interface KnowledgeSummary {
  projectId: string;
  summary: {
    goals: {
      total: number;
      open: number;
      inProgress: number;
      completed: number;
    };
    contexts: {
      total: number;
      groups: number;
      documented: number;
    };
    backlog: {
      total: number;
      pending: number;
      completed: number;
    };
    ideas: {
      total: number;
      pending: number;
      approved: number;
    };
    documentation: {
      available: boolean;
      sections: number;
    };
  };
  highlights: string[];
  recommendations: string[];
}

export interface ContextOverview {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  groupName?: string;
  hasDocumentation: boolean;
  lastUpdated?: string;
}

export interface GoalOverview {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  contextName?: string;
  completionDate?: string;
}

export interface ProjectInsight {
  type: 'warning' | 'info' | 'success' | 'recommendation';
  message: string;
  actionable: boolean;
  details?: string;
}

/**
 * Get comprehensive project knowledge summary
 */
export async function getProjectKnowledgeSummary(projectId: string): Promise<KnowledgeSummary> {
  try {
    // Fetch all data in parallel
    const [goals, contexts, contextGroups, backlogItems, ideas] = await Promise.all([
      goalDb.getGoalsByProject(projectId),
      contextDb.getContextsByProject(projectId),
      contextGroupDb.getGroupsByProject(projectId),
      backlogDb.getBacklogItemsByProject(projectId),
      ideaDb.getIdeasByProject(projectId)
    ]);

    // Calculate statistics
    const summary = {
      goals: {
        total: goals.length,
        open: goals.filter(g => g.status === 'open').length,
        inProgress: goals.filter(g => g.status === 'in_progress').length,
        completed: goals.filter(g => g.status === 'done').length
      },
      contexts: {
        total: contexts.length,
        groups: contextGroups.length,
        documented: contexts.filter(c => c.has_context_file).length
      },
      backlog: {
        total: backlogItems.length,
        pending: backlogItems.filter(b => b.status === 'pending').length,
        completed: backlogItems.filter(b => b.status === 'accepted').length
      },
      ideas: {
        total: ideas.length,
        pending: ideas.filter(i => i.status === 'pending').length,
        approved: ideas.filter(i => i.status === 'accepted').length
      },
      documentation: {
        available: false,
        sections: 0
      }
    };

    // Generate highlights
    const highlights: string[] = [];
    if (summary.goals.inProgress > 0) {
      highlights.push(`${summary.goals.inProgress} active goal${summary.goals.inProgress > 1 ? 's' : ''} in progress`);
    }
    if (summary.ideas.pending > 5) {
      highlights.push(`${summary.ideas.pending} pending ideas awaiting review`);
    }
    if (summary.contexts.documented > 0) {
      highlights.push(`${summary.contexts.documented} well-documented context${summary.contexts.documented > 1 ? 's' : ''}`);
    }
    if (summary.backlog.pending > 10) {
      highlights.push(`${summary.backlog.pending} backlog items to process`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (summary.goals.open > summary.goals.inProgress && summary.goals.open > 3) {
      recommendations.push('Consider starting work on open goals');
    }
    if (summary.ideas.pending > 10) {
      recommendations.push('Review and triage pending ideas');
    }
    if (summary.backlog.pending > summary.backlog.completed) {
      recommendations.push('Focus on clearing backlog items');
    }
    if (summary.contexts.total > 0 && summary.contexts.documented < summary.contexts.total / 2) {
      recommendations.push('Document remaining contexts for better knowledge capture');
    }

    return {
      projectId,
      summary,
      highlights,
      recommendations
    };
  } catch (error) {
    // Knowledge query failed - error will be handled by caller
    throw error;
  }
}

/**
 * Get formatted context overviews for voice presentation
 */
export async function getContextOverviews(projectId: string, limit = 5): Promise<ContextOverview[]> {
  try {
    const contexts = await contextDb.getContextsByProject(projectId);
    const groups = await contextGroupDb.getGroupsByProject(projectId);

    // Create group lookup
    const groupLookup = new Map(groups.map(g => [g.id, g.name]));

    return contexts.slice(0, limit).map(ctx => {
      const filePaths = typeof ctx.file_paths === 'string'
        ? JSON.parse(ctx.file_paths)
        : ctx.file_paths || [];

      return {
        id: ctx.id,
        name: ctx.name,
        description: ctx.description ?? undefined,
        fileCount: Array.isArray(filePaths) ? filePaths.length : 0,
        groupName: ctx.group_id ? groupLookup.get(ctx.group_id) : undefined,
        hasDocumentation: Boolean(ctx.has_context_file),
        lastUpdated: ctx.updated_at
      };
    });
  } catch (error) {
    // Context overview query failed - error will be handled by caller
    throw error;
  }
}

/**
 * Get formatted goal overviews for voice presentation
 */
export async function getGoalOverviews(projectId: string, statusFilter?: string, limit = 5): Promise<GoalOverview[]> {
  try {
    let goals = await goalDb.getGoalsByProject(projectId);

    // Apply status filter if provided
    if (statusFilter) {
      goals = goals.filter(g => g.status === statusFilter);
    }

    // Get context names for goals with context_id
    const contexts = await contextDb.getContextsByProject(projectId);
    const contextLookup = new Map(contexts.map(c => [c.id, c.name]));

    return goals.slice(0, limit).map(goal => ({
      id: goal.id,
      title: goal.title,
      description: goal.description ?? undefined,
      status: goal.status,
      priority: undefined,
      contextName: goal.context_id ? contextLookup.get(goal.context_id) : undefined,
      completionDate: goal.status === 'done' ? goal.updated_at : undefined
    }));
  } catch (error) {
    // Goal overview query failed - error will be handled by caller
    throw error;
  }
}

/**
 * Get project insights and recommendations
 */
export async function getProjectInsights(projectId: string): Promise<ProjectInsight[]> {
  try {
    const summary = await getProjectKnowledgeSummary(projectId);
    const insights: ProjectInsight[] = [];

    // Goal insights
    if (summary.summary.goals.open > 5 && summary.summary.goals.inProgress === 0) {
      insights.push({
        type: 'warning',
        message: 'Multiple open goals with no active work',
        actionable: true,
        details: 'Consider prioritizing and starting work on key goals'
      });
    }

    if (summary.summary.goals.inProgress > 3) {
      insights.push({
        type: 'info',
        message: 'Many goals in progress simultaneously',
        actionable: true,
        details: 'Consider focusing efforts on fewer goals for faster completion'
      });
    }

    // Backlog insights
    const backlogRatio = summary.summary.backlog.pending / (summary.summary.backlog.completed || 1);
    if (backlogRatio > 3) {
      insights.push({
        type: 'warning',
        message: 'Backlog growing faster than completion rate',
        actionable: true,
        details: 'Review and prioritize backlog items, consider archiving low-priority items'
      });
    }

    // Idea insights
    if (summary.summary.ideas.pending > 15) {
      insights.push({
        type: 'recommendation',
        message: 'Large number of pending ideas',
        actionable: true,
        details: 'Run an idea review session to approve or reject pending ideas'
      });
    }

    // Documentation insights
    const docCoverage = summary.summary.contexts.documented / (summary.summary.contexts.total || 1);
    if (docCoverage < 0.5 && summary.summary.contexts.total > 3) {
      insights.push({
        type: 'recommendation',
        message: 'Less than half of contexts are documented',
        actionable: true,
        details: 'Generate context documentation to improve knowledge capture'
      });
    }

    // Success insights
    if (summary.summary.goals.completed > 10) {
      insights.push({
        type: 'success',
        message: `${summary.summary.goals.completed} goals completed`,
        actionable: false,
        details: 'Great progress on project objectives'
      });
    }

    return insights;
  } catch (error) {
    // Project insights query failed - error will be handled by caller
    throw error;
  }
}

/**
 * Quick search across all knowledge types
 */
export async function quickSearch(projectId: string, query: string): Promise<{
  goals: GoalOverview[];
  contexts: ContextOverview[];
  ideas: Array<{ id: string; title: string; description?: string }>;
}> {
  try {
    const searchTerm = query.toLowerCase();

    const [goals, contexts, ideas] = await Promise.all([
      goalDb.getGoalsByProject(projectId),
      contextDb.getContextsByProject(projectId),
      ideaDb.getIdeasByProject(projectId)
    ]);

    // Search goals
    const matchingGoals = goals.filter(g =>
      g.title.toLowerCase().includes(searchTerm) ||
      g.description?.toLowerCase().includes(searchTerm)
    );

    // Search contexts
    const matchingContexts = contexts.filter(c =>
      c.name.toLowerCase().includes(searchTerm) ||
      c.description?.toLowerCase().includes(searchTerm)
    );

    // Search ideas
    const matchingIdeas = ideas.filter(i =>
      i.title?.toLowerCase().includes(searchTerm) ||
      i.description?.toLowerCase().includes(searchTerm)
    );

    // Get context groups for matching contexts
    const groups = await contextGroupDb.getGroupsByProject(projectId);
    const groupLookup = new Map(groups.map(g => [g.id, g.name]));

    const contextOverviews = matchingContexts.map(ctx => {
      const filePaths = typeof ctx.file_paths === 'string'
        ? JSON.parse(ctx.file_paths)
        : ctx.file_paths || [];

      return {
        id: ctx.id,
        name: ctx.name,
        description: ctx.description ?? undefined,
        fileCount: Array.isArray(filePaths) ? filePaths.length : 0,
        groupName: ctx.group_id ? groupLookup.get(ctx.group_id) : undefined,
        hasDocumentation: Boolean(ctx.has_context_file),
        lastUpdated: ctx.updated_at
      };
    });

    // Get contexts for matching goals
    const contextLookup = new Map(contexts.map(c => [c.id, c.name]));

    const goalOverviews = matchingGoals.map(goal => ({
      id: goal.id,
      title: goal.title,
      description: goal.description ?? undefined,
      status: goal.status,
      priority: undefined,
      contextName: goal.context_id ? contextLookup.get(goal.context_id) : undefined,
      completionDate: goal.status === 'done' ? goal.updated_at : undefined
    }));

    return {
      goals: goalOverviews.slice(0, 5),
      contexts: contextOverviews.slice(0, 5),
      ideas: matchingIdeas.slice(0, 5).map(i => ({
        id: i.id,
        title: i.title || 'Untitled Idea',
        description: i.description ?? undefined
      }))
    };
  } catch (error) {
    // Quick search query failed - error will be handled by caller
    throw error;
  }
}

/**
 * Get recent implementation activity
 */
export async function getRecentActivity(projectId: string, limit = 5): Promise<Array<{
  id: string;
  title: string;
  type: 'implementation' | 'goal' | 'idea';
  timestamp: string;
  summary: string;
}>> {
  try {
    const [implementations, goals, ideas] = await Promise.all([
      implementationLogDb.getLogsByProject(projectId),
      goalDb.getGoalsByProject(projectId),
      ideaDb.getIdeasByProject(projectId)
    ]);

    const activities: Array<{
      id: string;
      title: string;
      type: 'implementation' | 'goal' | 'idea';
      timestamp: string;
      summary: string;
    }> = [];

    // Add recent implementations
    implementations.slice(0, 3).forEach(impl => {
      activities.push({
        id: impl.id,
        title: impl.title,
        type: 'implementation',
        timestamp: impl.created_at,
        summary: impl.overview?.substring(0, 100) || 'Implementation completed'
      });
    });

    // Add recently completed goals
    goals
      .filter(g => g.status === 'done')
      .slice(0, 2)
      .forEach(goal => {
        activities.push({
          id: goal.id,
          title: goal.title,
          type: 'goal',
          timestamp: goal.updated_at || goal.created_at,
          summary: `Goal completed: ${goal.description?.substring(0, 80) || ''}`
        });
      });

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  } catch (error) {
    // Recent activity query failed - error will be handled by caller
    throw error;
  }
}

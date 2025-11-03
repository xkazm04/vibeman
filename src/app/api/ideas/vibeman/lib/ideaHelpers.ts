import { ideaDb, goalDb, contextDb } from '@/app/db';

export interface DbIdea {
  id: string;
  title: string;
  status: string;
  category?: string;
  effort?: number;
  impact?: number;
  description?: string;
  reasoning?: string;
  scan_type?: string;
  goal_id?: string | null;
  context_id?: string | null;
  requirement_id?: string | null;
  project_id: string;
  created_at: string;
}

export interface DbGoal {
  id: string;
  title: string;
  status: string;
  description?: string;
}

export interface IdeaStatus {
  pendingIdeasCount: number;
  acceptedIdeasCount: number;
  implementedIdeasCount: number;
  openGoalsCount: number;
}

export function getFirstAcceptedIdea(projectId: string): {
  ideaId: string | null;
  idea?: DbIdea;
} {
  try {
    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const acceptedIdeas = allIdeas.filter(idea => idea.status === 'accepted');

    if (acceptedIdeas.length === 0) {
      return { ideaId: null };
    }

    // Sort by created_at (oldest first) to maintain FIFO order
    acceptedIdeas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
      ideaId: acceptedIdeas[0].id,
      idea: acceptedIdeas[0],
    };
  } catch (error) {
    return { ideaId: null };
  }
}

export function getAutomationStatus(projectId: string): IdeaStatus {
  const allIdeas = ideaDb.getIdeasByProject(projectId);
  const allGoals = goalDb.getGoalsByProject(projectId);

  return {
    pendingIdeasCount: allIdeas.filter(i => i.status === 'pending').length,
    acceptedIdeasCount: allIdeas.filter(i => i.status === 'accepted').length,
    implementedIdeasCount: allIdeas.filter(i => i.status === 'implemented').length,
    openGoalsCount: allGoals.filter(g => g.status === 'open' || g.status === 'in_progress').length,
  };
}

export function markIdeaAsImplemented(ideaId: string): {
  success: boolean;
  error?: string;
} {
  try {
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return {
        success: false,
        error: 'Idea not found',
      };
    }

    const now = new Date().toISOString();
    ideaDb.updateIdea(ideaId, {
      status: 'implemented',
      implemented_at: now,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function generateRequirementName(ideaId: string, title: string): string {
  return `idea-${ideaId.substring(0, 8)}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 30)}`;
}

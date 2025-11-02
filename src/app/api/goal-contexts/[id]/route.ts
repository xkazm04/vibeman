import { NextRequest, NextResponse } from 'next/server';
import { goalDb, contextDb, scanDb, ideaDb } from '@/app/db';

/**
 * Context Aggregation API Endpoint
 *
 * GET /api/goal-contexts/[id]
 *
 * Fetches a goal with all related data in a single transaction:
 * - Goal details
 * - Associated contexts
 * - Scans related to those contexts
 * - Ideas generated from those scans
 *
 * This endpoint reduces round-trips and eliminates client-side joins,
 * providing a complete data payload for the Annette Voicebot.
 */

export interface GoalContextAggregation {
  goal: {
    id: string;
    project_id: string;
    context_id: string | null;
    order_index: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    created_at: string;
    updated_at: string;
  };
  contexts: Array<{
    id: string;
    project_id: string;
    group_id: string | null;
    name: string;
    description: string | null;
    file_paths: string[];
    has_context_file: boolean;
    context_file_path: string | null;
    preview: string | null;
    test_scenario: string | null;
    test_updated: string | null;
    created_at: string;
    updated_at: string;
  }>;
  scans: Array<{
    id: string;
    project_id: string;
    scan_type: string;
    timestamp: string;
    summary: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    created_at: string;
  }>;
  ideas: Array<{
    id: string;
    scan_id: string;
    project_id: string;
    context_id: string | null;
    scan_type: string;
    category: string;
    title: string;
    description: string | null;
    reasoning: string | null;
    status: 'pending' | 'accepted' | 'rejected' | 'implemented';
    user_feedback: string | null;
    user_pattern: boolean;
    effort: number | null;
    impact: number | null;
    requirement_id: string | null;
    goal_id: string | null;
    created_at: string;
    updated_at: string;
    implemented_at: string | null;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;

    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Fetch the goal
    const goal = goalDb.getGoalById(goalId);

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found', goalId },
        { status: 404 }
      );
    }

    // Fetch contexts associated with the goal's project
    const projectContexts = contextDb.getContextsByProject(goal.project_id);

    // If goal has a specific context_id, filter to that context
    // Otherwise, include all contexts for the project
    const contexts = goal.context_id
      ? projectContexts.filter(ctx => ctx.id === goal.context_id)
      : projectContexts;

    // Parse file_paths from JSON string to array for each context
    const parsedContexts = contexts.map(ctx => ({
      ...ctx,
      file_paths: JSON.parse(ctx.file_paths),
      has_context_file: Boolean(ctx.has_context_file)
    }));

    // Fetch all scans for the project
    const projectScans = scanDb.getScansByProject(goal.project_id);

    // Fetch all ideas for the project
    const projectIdeas = ideaDb.getIdeasByProject(goal.project_id);

    // Filter ideas that are associated with the goal or its contexts
    const contextIds = new Set(contexts.map(ctx => ctx.id));
    const relevantIdeas = projectIdeas.filter(
      idea => idea.goal_id === goalId || (idea.context_id && contextIds.has(idea.context_id))
    );

    // Get scan IDs from relevant ideas
    const scanIds = new Set(relevantIdeas.map(idea => idea.scan_id));

    // Filter scans to only those that generated relevant ideas
    const relevantScans = projectScans.filter(scan => scanIds.has(scan.id));

    // Convert user_pattern from SQLite integer to boolean for ideas
    const parsedIdeas = relevantIdeas.map(idea => ({
      ...idea,
      user_pattern: Boolean(idea.user_pattern)
    }));

    // Build aggregated response
    const aggregation: GoalContextAggregation = {
      goal: {
        id: goal.id,
        project_id: goal.project_id,
        context_id: goal.context_id,
        order_index: goal.order_index,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        created_at: goal.created_at,
        updated_at: goal.updated_at
      },
      contexts: parsedContexts,
      scans: relevantScans,
      ideas: parsedIdeas
    };

    return NextResponse.json(aggregation, { status: 200 });

  } catch (error) {
    console.error('[goal-contexts] Error fetching goal aggregation:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

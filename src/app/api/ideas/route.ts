import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, scanDb, DbIdea } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/ideas
 * Get all ideas or filter by query parameters
 * Query params:
 * - projectId: Filter by project
 * - goalId: Filter by goal (can be combined with projectId)
 * - status: Filter by status
 * - contextId: Filter by context
 * - limit: Limit number of results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const goalId = searchParams.get('goalId');
    const status = searchParams.get('status');
    const contextId = searchParams.get('contextId');
    const limit = searchParams.get('limit');

    let ideas: DbIdea[];

    // Priority order: goalId > contextId > projectId > status > limit > all
    if (goalId) {
      ideas = ideaDb.getIdeasByGoal(goalId);
      // If projectId is also specified, filter the results
      if (projectId) {
        ideas = ideas.filter(idea => idea.project_id === projectId);
      }
    } else if (contextId) {
      ideas = ideaDb.getIdeasByContext(contextId);
    } else if (projectId) {
      ideas = ideaDb.getIdeasByProject(projectId);
    } else if (status) {
      ideas = ideaDb.getIdeasByStatus(status as any);
    } else if (limit) {
      ideas = ideaDb.getRecentIdeas(parseInt(limit, 10));
    } else {
      ideas = ideaDb.getAllIdeas();
    }

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ideas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ideas
 * Create a new idea
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      scan_id,
      project_id,
      context_id,
      category,
      title,
      description,
      reasoning,
      status,
      user_feedback,
      user_pattern
    } = body;

    if (!scan_id || !project_id || !category || !title) {
      return NextResponse.json(
        { error: 'scan_id, project_id, category, and title are required' },
        { status: 400 }
      );
    }

    const idea = ideaDb.createIdea({
      id: uuidv4(),
      scan_id,
      project_id,
      context_id: context_id || null,
      category,
      title,
      description,
      reasoning,
      status,
      user_feedback,
      user_pattern
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    console.error('Error creating idea:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create idea' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ideas
 * Update an existing idea
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      user_feedback,
      user_pattern,
      title,
      description,
      reasoning
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const idea = ideaDb.updateIdea(id, {
      status,
      user_feedback,
      user_pattern,
      title,
      description,
      reasoning
    });

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error updating idea:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update idea' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ideas
 * Delete an idea or all ideas
 * Query params:
 * - id: Delete a single idea by ID
 * - all=true: Delete all ideas (WARNING: destructive)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    // Delete all ideas (for testing purposes)
    if (deleteAll) {
      const deletedCount = ideaDb.deleteAllIdeas();
      console.log(`[DELETE ALL IDEAS] Deleted ${deletedCount} ideas from database`);

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} ideas`
      });
    }

    // Delete single idea
    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required (or use all=true to delete all)' },
        { status: 400 }
      );
    }

    const success = ideaDb.deleteIdea(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting idea:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete idea' },
      { status: 500 }
    );
  }
}

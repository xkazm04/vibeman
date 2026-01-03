import { NextRequest, NextResponse } from 'next/server';
import { contextQueries, contextGroupQueries } from '../../../lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';

// GET /api/contexts - Get all contexts (optionally filtered by project or group)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const groupId = searchParams.get('groupId');

    // If groupId is provided, get contexts for that group
    if (groupId) {
      const contexts = await contextQueries.getContextsByGroup(groupId);

      return NextResponse.json({
        success: true,
        data: contexts
      });
    }

    // If projectId is provided, get contexts for that project
    if (projectId) {
      const [contexts, groups] = await Promise.all([
        contextQueries.getContextsByProject(projectId),
        contextGroupQueries.getGroupsByProject(projectId),
      ]);

      return NextResponse.json({
        success: true,
        data: { contexts, groups }
      });
    }

    // Otherwise, get all contexts across all projects
    const { getDatabase } = await import('@/app/db/connection');
    const db = getDatabase();
    const allContexts = db.prepare(`
      SELECT * FROM contexts
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json({
      success: true,
      data: { contexts: allContexts, groups: [] }
    });
  } catch (error) {
    logger.error('Failed to fetch contexts:', { error });
    return createErrorResponse('Failed to fetch contexts', 500);
  }
}

// POST /api/contexts - Create a new context
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, groupId, name, description, filePaths, testScenario } = body;

    if (!projectId || !name || !filePaths) {
      return createErrorResponse('Missing required fields', 400);
    }

    const context = await contextQueries.createContext({
      projectId,
      groupId,
      name,
      description,
      filePaths,
      testScenario,
    });

    return NextResponse.json({
      success: true,
      data: context
    });
  } catch (error) {
    logger.error('Failed to create context:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create context' },
      { status: 500 }
    );
  }
}

// PUT /api/contexts - Update a context
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, updates } = body;

    if (!contextId) {
      return createErrorResponse('Context ID is required', 400);
    }

    // Transform snake_case to camelCase for the query layer
    // This supports both API consumers using snake_case (like Claude Code curl commands)
    // and frontend consumers using camelCase
    const transformedUpdates = {
      name: updates.name,
      description: updates.description,
      filePaths: updates.file_paths ?? updates.filePaths,
      groupId: updates.group_id ?? updates.groupId,
      testScenario: updates.test_scenario ?? updates.testScenario,
      target: updates.target,
      target_rating: updates.target_rating,
    };

    const context = await contextQueries.updateContext(contextId, transformedUpdates);

    if (!context) {
      return notFoundResponse('Context');
    }

    return NextResponse.json({
      success: true,
      data: context
    });
  } catch (error) {
    logger.error('Failed to update context:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update context' },
      { status: 500 }
    );
  }
}

// DELETE /api/contexts - Delete a context or all contexts for a project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const projectId = searchParams.get('projectId');

    // Delete all contexts for a project
    if (projectId) {
      const deletedCount = await contextQueries.deleteAllContextsByProject(projectId);
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} contexts`,
        deletedCount
      });
    }

    // Delete a single context
    if (!contextId) {
      return createErrorResponse('Context ID or Project ID is required', 400);
    }

    const success = await contextQueries.deleteContext(contextId);

    if (!success) {
      return notFoundResponse('Context');
    }

    return NextResponse.json({
      success: true,
      message: 'Context deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete context:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete context' },
      { status: 500 }
    );
  }
}
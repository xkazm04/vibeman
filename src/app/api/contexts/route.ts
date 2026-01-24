import { NextRequest, NextResponse } from 'next/server';
import { contextQueries, contextGroupQueries } from '../../../lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse, validateRequiredFields } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';
import { parseProjectIds } from '@/lib/api-helpers/projectFilter';

// GET /api/contexts - Get all contexts (optionally filtered by project or group)
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectFilter = parseProjectIds(searchParams);
    const groupId = searchParams.get('groupId');

    // If groupId is provided, get contexts for that group
    if (groupId) {
      const contexts = await contextQueries.getContextsByGroup(groupId);

      return NextResponse.json({
        success: true,
        data: contexts
      });
    }

    // Single project: use optimized query
    if (projectFilter.mode === 'single') {
      const [contexts, groups] = await Promise.all([
        contextQueries.getContextsByProject(projectFilter.projectId!),
        contextGroupQueries.getGroupsByProject(projectFilter.projectId!),
      ]);

      return NextResponse.json({
        success: true,
        data: { contexts, groups }
      });
    }

    // Multi-project: query each and merge
    if (projectFilter.mode === 'multi') {
      const allContexts: any[] = [];
      const allGroups: any[] = [];
      for (const pid of projectFilter.projectIds!) {
        const [contexts, groups] = await Promise.all([
          contextQueries.getContextsByProject(pid),
          contextGroupQueries.getGroupsByProject(pid),
        ]);
        allContexts.push(...contexts);
        allGroups.push(...groups);
      }

      return NextResponse.json({
        success: true,
        data: { contexts: allContexts, groups: allGroups }
      });
    }

    // All projects: get everything
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
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, groupId, name, description, filePaths, testScenario } = body;

    const validationError = validateRequiredFields({ projectId, name, filePaths }, ['projectId', 'name', 'filePaths']);
    if (validationError) return validationError;

    const context = await contextQueries.createContext({
      projectId,
      groupId,
      name,
      description,
      filePaths,
      testScenario,
    });

    // Record brain signal: context created
    try {
      signalCollector.recordContextFocus(projectId, {
        contextId: context.id,
        contextName: name,
        duration: 0,
        actions: ['create'],
      });
    } catch {
      // Signal recording must never break the main flow
    }

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
async function handlePut(request: NextRequest) {
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

    // Record brain signal: context updated
    try {
      if (context.project_id) {
        signalCollector.recordContextFocus(context.project_id, {
          contextId,
          contextName: context.name || contextId,
          duration: 0,
          actions: ['update'],
        });
      }
    } catch {
      // Signal recording must never break the main flow
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
async function handleDelete(request: NextRequest) {
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

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/contexts');
export const POST = withObservability(handlePost, '/api/contexts');
export const PUT = withObservability(handlePut, '/api/contexts');
export const DELETE = withObservability(handleDelete, '/api/contexts');
import { NextRequest, NextResponse } from 'next/server';
import { contextQueries, contextGroupQueries } from '../../../lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse, validateRequiredFields } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';
import { parseProjectIds } from '@/lib/api-helpers/projectFilter';
import { validateFilePathArray } from '@/lib/pathSecurity';

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

    // Multi-project: batch query all projects in single request
    if (projectFilter.mode === 'multi') {
      const [contexts, groups] = await Promise.all([
        contextQueries.getContextsByProjects(projectFilter.projectIds!),
        contextGroupQueries.getGroupsByProjects(projectFilter.projectIds!),
      ]);

      return NextResponse.json({
        success: true,
        data: { contexts, groups }
      });
    }

    // All projects: get everything
    const [allContexts, allGroups] = await Promise.all([
      contextQueries.getAllContexts(),
      contextGroupQueries.getAllGroups(),
    ]);

    return NextResponse.json({
      success: true,
      data: { contexts: allContexts, groups: allGroups }
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
    const { projectId, groupId, name, description, filePaths, testScenario,
      entry_points, db_tables, keywords, api_surface, cross_refs, tech_stack } = body;

    const validationError = validateRequiredFields({ projectId, name, filePaths }, ['projectId', 'name', 'filePaths']);
    if (validationError) return validationError;

    // Validate file paths for directory traversal
    if (Array.isArray(filePaths)) {
      const pathErrors = validateFilePathArray(filePaths);
      if (pathErrors.length > 0) {
        return NextResponse.json(
          { error: 'Invalid file paths detected', details: pathErrors },
          { status: 400 }
        );
      }
    }

    // Validate group exists if groupId provided - prevents FK constraint failure
    let validGroupId = groupId || null;
    if (validGroupId) {
      try {
        const { contextGroupRepository } = await import('@/app/db/repositories/context-group.repository');
        const group = contextGroupRepository.getGroupById(validGroupId);
        if (!group) {
          logger.warn(`Group ${validGroupId} not found for context "${name}", creating without group`);
          validGroupId = null;
        }
      } catch {
        logger.warn(`Could not validate group ${validGroupId}, creating without group`);
        validGroupId = null;
      }
    }

    const context = await contextQueries.createContext({
      projectId,
      groupId: validGroupId,
      name,
      description,
      filePaths,
      testScenario,
      entryPoints: entry_points,
      dbTables: db_tables,
      keywords,
      apiSurface: api_surface,
      crossRefs: cross_refs,
      techStack: tech_stack,
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
      { error: 'Failed to create context' },
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
      entryPoints: updates.entry_points ?? updates.entryPoints,
      dbTables: updates.db_tables ?? updates.dbTables,
      keywords: updates.keywords,
      apiSurface: updates.api_surface ?? updates.apiSurface,
      crossRefs: updates.cross_refs ?? updates.crossRefs,
      techStack: updates.tech_stack ?? updates.techStack,
    };

    // Validate file paths for directory traversal if provided
    if (Array.isArray(transformedUpdates.filePaths)) {
      const pathErrors = validateFilePathArray(transformedUpdates.filePaths);
      if (pathErrors.length > 0) {
        return NextResponse.json(
          { error: 'Invalid file paths detected', details: pathErrors },
          { status: 400 }
        );
      }
    }

    const context = await contextQueries.updateContext(contextId, transformedUpdates);

    if (!context) {
      return notFoundResponse('Context');
    }

    // Record brain signal: context updated
    try {
      if (context.projectId) {
        signalCollector.recordContextFocus(context.projectId, {
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
      { error: 'Failed to update context' },
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
      { error: 'Failed to delete context' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/contexts');
export const POST = withObservability(handlePost, '/api/contexts');
export const PUT = withObservability(handlePut, '/api/contexts');
export const DELETE = withObservability(handleDelete, '/api/contexts');
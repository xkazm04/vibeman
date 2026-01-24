import { NextRequest, NextResponse } from 'next/server';
import { contextGroupQueries } from '../../../lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse, validateRequiredFields } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';

// GET /api/context-groups - Get all context groups for a project
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    const groups = await contextGroupQueries.getGroupsByProject(projectId);

    return NextResponse.json({
      success: true,
      data: groups
    });
  } catch (error) {
    logger.error('Failed to fetch context groups:', { error });
    return createErrorResponse('Failed to fetch context groups', 500);
  }
}

// POST /api/context-groups - Create a new context group
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, color, icon } = body;

    const validationError = validateRequiredFields({ projectId, name }, ['projectId', 'name']);
    if (validationError) return validationError;

    const group = await contextGroupQueries.createGroup({
      projectId,
      name,
      color,
      icon,
    });

    return NextResponse.json({
      success: true,
      data: group
    });
  } catch (error) {
    logger.error('Failed to create context group:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create context group' },
      { status: 500 }
    );
  }
}

// PUT /api/context-groups - Update a context group
async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, updates } = body;

    if (!groupId) {
      return createErrorResponse('Group ID is required', 400);
    }

    const group = await contextGroupQueries.updateGroup(groupId, updates);

    if (!group) {
      return notFoundResponse('Context group');
    }

    return NextResponse.json({
      success: true,
      data: group
    });
  } catch (error) {
    logger.error('Failed to update context group:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update context group' },
      { status: 500 }
    );
  }
}

// DELETE /api/context-groups - Delete a context group
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return createErrorResponse('Group ID is required', 400);
    }

    const success = await contextGroupQueries.deleteGroup(groupId);

    if (!success) {
      return notFoundResponse('Context group');
    }

    return NextResponse.json({
      success: true,
      message: 'Context group deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete context group:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete context group' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/context-groups');
export const POST = withObservability(handlePost, '/api/context-groups');
export const PUT = withObservability(handlePut, '/api/context-groups');
export const DELETE = withObservability(handleDelete, '/api/context-groups');
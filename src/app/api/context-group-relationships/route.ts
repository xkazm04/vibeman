import { NextRequest, NextResponse } from 'next/server';
import { contextGroupRelationshipQueries } from '@/lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';
import { scheduleContextMapExport } from '@/lib/contexts/exportContextMap';

// GET /api/context-group-relationships - Get all relationships for a project
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    const relationships = await contextGroupRelationshipQueries.getByProject(projectId);

    return NextResponse.json({
      success: true,
      data: relationships
    });
  } catch (error) {
    logger.error('Failed to fetch context group relationships:', { error });
    return createErrorResponse('Failed to fetch context group relationships', 500);
  }
}

// POST /api/context-group-relationships - Create a new relationship
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, sourceGroupId, targetGroupId, relationshipType } = body;

    if (!projectId || !sourceGroupId || !targetGroupId) {
      return createErrorResponse('Project ID, source group ID, and target group ID are required', 400);
    }

    if (sourceGroupId === targetGroupId) {
      return createErrorResponse('Source and target groups cannot be the same', 400);
    }

    // Check if relationship already exists
    const exists = await contextGroupRelationshipQueries.exists(sourceGroupId, targetGroupId);
    if (exists) {
      return createErrorResponse('Relationship already exists between these groups', 409);
    }

    const relationship = await contextGroupRelationshipQueries.create({
      projectId,
      sourceGroupId,
      targetGroupId,
      relationshipType,
    });

    if (!relationship) {
      return createErrorResponse('Failed to create relationship', 500);
    }

    // Relationships are exported in the map — keep it fresh on create.
    scheduleContextMapExport(projectId);

    return NextResponse.json({
      success: true,
      data: relationship
    });
  } catch (error) {
    logger.error('Failed to create context group relationship:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create relationship' },
      { status: 500 }
    );
  }
}

// DELETE /api/context-group-relationships - Delete a relationship
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('relationshipId');

    if (!relationshipId) {
      return createErrorResponse('Relationship ID is required', 400);
    }

    // Resolve the owning project BEFORE deleting so we can re-export the map.
    const owning = await contextGroupRelationshipQueries.getById(relationshipId);

    const success = await contextGroupRelationshipQueries.delete(relationshipId);

    if (!success) {
      return notFoundResponse('Relationship');
    }

    if (owning?.projectId) scheduleContextMapExport(owning.projectId);

    return NextResponse.json({
      success: true,
      message: 'Relationship deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete context group relationship:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/context-group-relationships');
export const POST = withObservability(handlePost, '/api/context-group-relationships');
export const DELETE = withObservability(handleDelete, '/api/context-group-relationships');

import { NextRequest, NextResponse } from 'next/server';
import { contextGroupRelationshipQueries } from '@/lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';

// GET /api/context-group-relationships - Get all relationships for a project
export async function GET(request: NextRequest) {
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, sourceGroupId, targetGroupId } = body;

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
    });

    if (!relationship) {
      return createErrorResponse('Failed to create relationship', 500);
    }

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
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('relationshipId');

    if (!relationshipId) {
      return createErrorResponse('Relationship ID is required', 400);
    }

    const success = await contextGroupRelationshipQueries.delete(relationshipId);

    if (!success) {
      return notFoundResponse('Relationship');
    }

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

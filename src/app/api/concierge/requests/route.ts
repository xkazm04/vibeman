/**
 * Feature Requests API
 * Handles CRUD operations for AI Code Concierge feature requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { featureRequestDb, DbFeatureRequest } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET - Fetch feature requests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') as DbFeatureRequest['status'] | null;
    const requestId = searchParams.get('requestId');

    // Get single request by ID
    if (requestId) {
      const featureRequest = featureRequestDb.getById(requestId);
      if (!featureRequest) {
        return NextResponse.json(
          { error: 'Feature request not found' },
          { status: 404 }
        );
      }

      // Get comments for this request
      const comments = featureRequestDb.getComments(requestId);

      return NextResponse.json({
        success: true,
        data: {
          request: featureRequest,
          comments,
        },
      });
    }

    // Get requests by project and optionally by status
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const requests = status
      ? featureRequestDb.getByStatus(projectId, status)
      : featureRequestDb.getByProjectId(projectId);

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch feature requests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new feature request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      projectId,
      requesterName,
      requesterEmail,
      source = 'ui',
      sourceMetadata,
      naturalLanguageDescription,
      priority = 'medium',
    } = body;

    // Validate required fields
    if (!projectId || !requesterName || !naturalLanguageDescription) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'projectId, requesterName, and naturalLanguageDescription are required',
        },
        { status: 400 }
      );
    }

    // Validate source
    const validSources = ['ui', 'notion', 'jira', 'confluence', 'slack', 'api'];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // Create feature request
    const featureRequest = featureRequestDb.create({
      id: uuidv4(),
      project_id: projectId,
      requester_name: requesterName,
      requester_email: requesterEmail,
      source,
      source_metadata: sourceMetadata ? JSON.stringify(sourceMetadata) : undefined,
      natural_language_description: naturalLanguageDescription,
      status: 'pending',
      priority,
    });

    return NextResponse.json({
      success: true,
      data: featureRequest,
    });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return NextResponse.json(
      {
        error: 'Failed to create feature request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a feature request
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, ...updates } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      );
    }

    // Check if request exists
    const existing = featureRequestDb.getById(requestId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    // Update the request
    const updated = featureRequestDb.update(requestId, updates);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating feature request:', error);
    return NextResponse.json(
      {
        error: 'Failed to update feature request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a feature request
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      );
    }

    const success = featureRequestDb.delete(requestId);

    if (!success) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feature request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feature request:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete feature request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

/**
 * POST - Simplified implementation log creation endpoint
 * 
 * This endpoint is designed for Claude Code prompts to easily create
 * implementation logs without needing to handle ID generation or snake_case.
 * 
 * Request body (camelCase):
 * - projectId: string (required)
 * - requirementName: string (required)
 * - title: string (required)
 * - overview: string (required)
 * - overviewBullets: string (optional) - bullets separated by \n
 * - contextId: string (optional)
 * - screenshot: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      requirementName, 
      title, 
      overview, 
      overviewBullets,
      contextId,
      screenshot 
    } = body;

    // Validate required fields
    if (!projectId || !requirementName || !title || !overview) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          required: ['projectId', 'requirementName', 'title', 'overview'],
          received: Object.keys(body)
        },
        { status: 400 }
      );
    }

    // Auto-generate ID
    const id = randomUUID();

    // Create the log entry
    const log = implementationLogDb.createLog({
      id,
      project_id: projectId,
      context_id: contextId || null,
      requirement_name: requirementName,
      title,
      overview,
      overview_bullets: overviewBullets || null,
      tested: false,
      screenshot: screenshot || null,
    });

    logger.info('Implementation log created via simplified API', {
      id,
      projectId,
      requirementName,
      title,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Implementation log created successfully',
      log: {
        id: log.id,
        projectId: log.project_id,
        requirementName: log.requirement_name,
        title: log.title,
      }
    });
  } catch (error) {
    logger.error('Error creating implementation log:', { error });
    
    // Return non-blocking error - Claude should continue even if logging fails
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create implementation log',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'This error is non-blocking - continue with task completion'
      },
      { status: 500 }
    );
  }
}

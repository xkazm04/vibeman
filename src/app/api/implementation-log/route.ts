import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb, ideaDb, contextDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { signalCollector } from '@/lib/brain/signalCollector';
import { invalidateContextCache } from '@/lib/brain/brainService';

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

    // Record brain signal: implementation logged
    try {
      signalCollector.recordImplementation(projectId, {
        requirementId: id,
        requirementName,
        contextId: contextId || null,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        success: true,
        executionTimeMs: 0,
      });
      // Invalidate Brain context cache so dashboard reflects new signal
      invalidateContextCache(projectId);
    } catch {
      // Signal recording must never break the main flow
    }

    // Auto-update idea status to 'implemented' if matching idea exists
    try {
      const idea = ideaDb.getIdeaByRequirementId(requirementName);
      if (idea && idea.status !== 'implemented') {
        ideaDb.updateIdea(idea.id, { status: 'implemented' });
        if (idea.context_id) {
          contextDb.incrementImplementedTasks(idea.context_id);
        }
      }
    } catch {
      // Idea update must never break the main flow
    }

    // Fire-and-forget: check if this log matches any active goals
    if (contextId) {
      fetch(new URL('/api/goals/check-completion', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId, projectId }),
      }).catch(() => {});
    }

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

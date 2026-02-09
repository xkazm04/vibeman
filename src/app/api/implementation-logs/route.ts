import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';

/**
 * GET - Get recent implementation logs for a project
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limitParam = searchParams.get('limit');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    const logs = implementationLogDb.getRecentLogsByProject(projectId, limit);

    return NextResponse.json({ logs });
  } catch (error) {
    logger.error('Error fetching implementation logs:', { error: error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new implementation log
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested } = body;

    if (!id || !project_id || !requirement_name || !title || !overview) {
      return NextResponse.json(
        { error: 'Missing required fields: id, project_id, requirement_name, title, overview' },
        { status: 400 }
      );
    }

    const log = implementationLogDb.createLog({
      id,
      project_id,
      context_id: context_id || undefined,
      requirement_name,
      title,
      overview,
      overview_bullets,
      tested: tested || false,
    });

    // Record brain signal: implementation logged
    try {
      signalCollector.recordImplementation(project_id, {
        requirementId: id,
        requirementName: requirement_name,
        contextId: context_id || null,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        success: true,
        executionTimeMs: 0,
      });
    } catch {
      // Signal recording must never break the main flow
    }

    // Fire-and-forget: check if this log matches any active goals
    if (context_id) {
      fetch(new URL('/api/goals/check-completion', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId: context_id, projectId: project_id }),
      }).catch(() => {});
    }

    return NextResponse.json({ log });
  } catch (error) {
    logger.error('Error creating implementation log:', { error: error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update an implementation log (e.g., mark as tested)
 */
async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tested, overview, overview_bullets } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      );
    }

    const log = implementationLogDb.updateLog(id, {
      tested: tested !== undefined ? tested : undefined,
      overview: overview !== undefined ? overview : undefined,
      overview_bullets: overview_bullets !== undefined ? overview_bullets : undefined,
    });

    if (!log) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    logger.error('Error updating implementation log:', { error: error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an implementation log
 */
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      );
    }

    implementationLogDb.deleteLog(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting implementation log:', { error: error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/implementation-logs');
export const POST = withObservability(handlePost, '/api/implementation-logs');
export const PATCH = withObservability(handlePatch, '/api/implementation-logs');
export const DELETE = withObservability(handleDelete, '/api/implementation-logs');

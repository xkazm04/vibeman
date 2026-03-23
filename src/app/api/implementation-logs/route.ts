import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { emitImplementationLogged } from '@/lib/events/domainEmitters';

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
 *
 * Accepts two input formats:
 * - snake_case (standard): { id, project_id, context_id, requirement_name, ... }
 * - camelCase (simplified): { projectId, requirementName, ... } — auto-generates ID
 *
 * Simplified mode is detected by the presence of `projectId` (camelCase) in the body.
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    // Detect simplified (camelCase) mode by checking for `projectId`
    const isSimplified = 'projectId' in body && !('project_id' in body);

    const logId = isSimplified ? randomUUID() : body.id;
    const projectId = isSimplified ? body.projectId : body.project_id;
    const contextId = isSimplified ? (body.contextId || null) : (body.context_id || null);
    const requirementName = isSimplified ? body.requirementName : body.requirement_name;
    const { title, overview, provider, model } = body;
    const overviewBullets = isSimplified ? (body.overviewBullets || null) : body.overview_bullets;
    const screenshot = body.screenshot || null;
    const metadata = body.metadata ? (typeof body.metadata === 'string' ? body.metadata : JSON.stringify(body.metadata)) : undefined;
    const tested = body.tested || false;

    if (!projectId || !requirementName || !title || !overview) {
      const missing = isSimplified
        ? ['projectId', 'requirementName', 'title', 'overview']
        : ['project_id', 'requirement_name', 'title', 'overview'];
      if (!isSimplified && !logId) missing.unshift('id');
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: missing,
          received: Object.keys(body),
        },
        { status: 400 }
      );
    }

    const log = implementationLogDb.createLog({
      id: logId,
      project_id: projectId,
      context_id: contextId || undefined,
      requirement_name: requirementName,
      title,
      overview,
      overview_bullets: overviewBullets,
      tested,
      screenshot,
      provider: provider || undefined,
      model: model || undefined,
      metadata,
    });

    logger.info('Implementation log created', {
      id: logId,
      projectId,
      requirementName,
      title,
      mode: isSimplified ? 'simplified' : 'standard',
    });

    // Emit domain event — subscribers handle signal recording, idea status, goal checks
    emitImplementationLogged({
      projectId,
      logId,
      requirementName,
      contextId,
      provider,
      model,
    });

    // Return format depends on mode
    if (isSimplified) {
      return NextResponse.json({
        success: true,
        message: 'Implementation log created successfully',
        log: {
          id: log.id,
          projectId: log.project_id,
          requirementName: log.requirement_name,
          title: log.title,
        },
      });
    }

    return NextResponse.json({ log });
  } catch (error) {
    logger.error('Error creating implementation log:', { error: error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create implementation log',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'This error is non-blocking - continue with task completion',
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

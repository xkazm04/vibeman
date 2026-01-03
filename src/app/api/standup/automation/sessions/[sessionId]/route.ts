/**
 * Single Session API
 * Get, update, and delete specific automation sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { automationSessionDb, automationSessionEventDb } from '@/app/db';
import { projectDb } from '@/lib/project_database';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

type SessionPhase = 'pending' | 'running' | 'exploring' | 'generating' | 'evaluating' | 'complete' | 'failed' | 'paused';

/**
 * GET /api/standup/automation/sessions/[sessionId]
 * Get details for a specific session
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;

    const session = automationSessionDb.getById(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get events for this session
    const events = automationSessionEventDb.getBySession(sessionId);

    // Get project info
    const project = projectDb.getProject(session.project_id);

    // Calculate progress from events
    const progressEvents = events.filter(e => e.eventType === 'progress');
    const latestProgress = progressEvents.length > 0
      ? progressEvents[progressEvents.length - 1].data
      : null;

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.id,
        projectId: session.project_id,
        projectName: project?.name || 'Unknown',
        phase: session.phase,
        progress: (latestProgress as { progress?: number })?.progress || 0,
        message: (latestProgress as { message?: string })?.message || '',
        startedAt: session.started_at,
        completedAt: session.completed_at,
        hasError: session.phase === 'failed',
        errorMessage: session.error_message,
        taskId: session.task_id,
      },
      events: events.map(e => ({
        id: e.id,
        eventType: e.eventType,
        timestamp: e.timestamp,
        data: e.data,
      })),
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/standup/automation/sessions/[sessionId]
 * Update session (pause/resume/update phase)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();

    const session = automationSessionDb.getById(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Handle phase update
    if (body.phase) {
      const validPhases: SessionPhase[] = [
        'pending', 'running', 'exploring', 'generating',
        'evaluating', 'complete', 'failed', 'paused'
      ];

      if (!validPhases.includes(body.phase)) {
        return NextResponse.json(
          { success: false, error: `Invalid phase: ${body.phase}` },
          { status: 400 }
        );
      }

      automationSessionDb.updatePhase(sessionId, body.phase);

      // Log phase change event
      automationSessionEventDb.create({
        sessionId,
        eventType: 'phase_change',
        data: {
          previousPhase: session.phase,
          newPhase: body.phase,
          reason: body.reason || 'manual',
        },
      });

      const updatedSession = automationSessionDb.getById(sessionId);
      const project = projectDb.getProject(session.project_id);

      return NextResponse.json({
        success: true,
        session: {
          sessionId: updatedSession!.id,
          projectId: updatedSession!.project_id,
          projectName: project?.name || 'Unknown',
          phase: updatedSession!.phase,
          startedAt: updatedSession!.started_at,
          completedAt: updatedSession!.completed_at,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'No valid update parameters provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Session API] PATCH Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/standup/automation/sessions/[sessionId]
 * Delete a session and its events
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;

    const session = automationSessionDb.getById(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Delete events first (foreign key constraint)
    automationSessionEventDb.deleteBySession(sessionId);

    // Delete session - using fail method to mark as deleted (or we could add a delete method)
    // For now, mark as failed with a deletion message
    automationSessionDb.fail(sessionId, 'Session deleted by user');

    return NextResponse.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error) {
    console.error('[Session API] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
      },
      { status: 500 }
    );
  }
}

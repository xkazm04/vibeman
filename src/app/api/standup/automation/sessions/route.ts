/**
 * Automation Sessions API
 * Endpoint for querying automation sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { automationSessionDb } from '@/app/db';
import type { DbAutomationSession } from '@/app/db/models/automation-session.types';
import { projectDb } from '@/lib/project_database';

/**
 * GET /api/standup/automation/sessions
 * Get automation sessions with optional filtering
 *
 * Query params:
 * - status: 'active' | 'completed' | 'all' (default: 'all')
 * - projectId: filter by project
 * - limit: max results (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Determine which phases to include based on status filter
    let phases: string[] | undefined;
    if (status === 'active') {
      phases = ['pending', 'running', 'exploring', 'generating', 'evaluating'];
    } else if (status === 'completed') {
      phases = ['complete', 'failed'];
    }

    // Get sessions from database
    let sessions: DbAutomationSession[];
    if (projectId) {
      sessions = automationSessionDb.getByProjectId(projectId);
    } else {
      // Get recent sessions across all projects
      sessions = automationSessionDb.getRecent(limit);
    }

    // Filter by phase if specified
    if (phases) {
      sessions = sessions.filter((s: DbAutomationSession) => phases!.includes(s.phase));
    }

    // Limit results
    sessions = sessions.slice(0, limit);

    // Enrich with project names
    const enrichedSessions = sessions.map((session: DbAutomationSession) => {
      const project = projectDb.getProject(session.project_id);
      return {
        sessionId: session.id,
        projectId: session.project_id,
        projectName: project?.name || 'Unknown Project',
        phase: session.phase,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        hasError: session.phase === 'failed',
        errorMessage: session.error_message,
        taskId: session.task_id,
        // These would come from the progress cache in the progress API
        progress: 0,
        message: '',
      };
    });

    return NextResponse.json({
      success: true,
      sessions: enrichedSessions,
      count: enrichedSessions.length,
    });
  } catch (error) {
    logger.error('[Sessions API] Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      },
      { status: 500 }
    );
  }
}

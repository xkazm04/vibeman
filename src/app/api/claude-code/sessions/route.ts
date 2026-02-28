/**
 * Claude Code Sessions API
 * Manages Claude Code sessions with --resume flag support
 *
 * GET /api/claude-code/sessions
 *   - ?claudeSessionId=X  → Get session by Claude session ID
 *   - ?sessionId=X        → Get session by internal ID
 *   - ?projectId=X        → List sessions for project
 *   - ?projectId=X&action=active → Get active sessions
 *   - ?projectId=X&action=stats  → Get session statistics
 *
 * DELETE /api/claude-code/sessions?sessionId=X → Delete a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionDb } from '@/app/db';
import {
  validateRequired,
  successResponse,
  errorResponse,
} from '@/lib/api-errors';
import {
  toSessionResponse,
  toSessionTaskResponse,
} from '@/app/db/models/session.types';

/**
 * GET - List sessions or get session details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const sessionId = searchParams.get('sessionId');
    const claudeSessionId = searchParams.get('claudeSessionId');
    const action = searchParams.get('action');

    // Get session by Claude session ID
    if (claudeSessionId) {
      const session = sessionDb.getByClaudeSessionId(claudeSessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const tasks = sessionDb.getTasksBySessionId(session.id);
      return NextResponse.json({
        session: toSessionResponse(session),
        tasks: tasks.map(toSessionTaskResponse),
      });
    }

    // Get session by internal ID
    if (sessionId) {
      const session = sessionDb.getById(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const tasks = sessionDb.getTasksBySessionId(session.id);
      return NextResponse.json({
        session: toSessionResponse(session),
        tasks: tasks.map(toSessionTaskResponse),
      });
    }

    // List sessions for project
    if (projectId) {
      // Get active sessions
      if (action === 'active') {
        const sessions = sessionDb.getActive(projectId);
        return NextResponse.json({
          sessions: sessions.map(toSessionResponse),
        });
      }

      // Get session stats
      if (action === 'stats') {
        const stats = sessionDb.getStats(projectId);
        return NextResponse.json({ stats });
      }

      // List all sessions
      const sessions = sessionDb.getByProjectId(projectId);
      return NextResponse.json({
        sessions: sessions.map(toSessionResponse),
      });
    }

    return NextResponse.json(
      { error: 'Missing required parameter: projectId, sessionId, or claudeSessionId' },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/sessions');
  }
}

/**
 * DELETE - Delete a session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const validationError = validateRequired({ sessionId }, ['sessionId']);
    if (validationError) return validationError;

    const deleted = sessionDb.delete(sessionId!);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return successResponse({}, 'Session deleted successfully');
  } catch (error) {
    return errorResponse(error, 'Error in DELETE /api/claude-code/sessions');
  }
}

/**
 * Claude Code Sessions API
 * Manages Claude Code sessions with --resume flag support
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
  ClaudeCodeSessionStatus,
  ClaudeCodeSessionTaskStatus,
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
 * POST - Create session, add task, or update status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, projectId, name, taskId, requirementName, status, claudeSessionId, extras, contextTokens } = body;

    // Create new session
    if (action === 'create') {
      const validationError = validateRequired(
        { projectId, name, taskId, requirementName },
        ['projectId', 'name', 'taskId', 'requirementName']
      );
      if (validationError) return validationError;

      const session = sessionDb.create({
        projectId,
        name,
        taskId,
        requirementName,
      });

      const tasks = sessionDb.getTasksBySessionId(session.id);
      return NextResponse.json({
        success: true,
        session: toSessionResponse(session),
        tasks: tasks.map(toSessionTaskResponse),
      });
    }

    // Add task to session
    if (action === 'add-task') {
      const validationError = validateRequired(
        { sessionId, taskId, requirementName },
        ['sessionId', 'taskId', 'requirementName']
      );
      if (validationError) return validationError;

      const task = sessionDb.addTask(sessionId, taskId, requirementName);
      if (!task) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        task: toSessionTaskResponse(task),
      });
    }

    // Remove task from session
    if (action === 'remove-task') {
      const validationError = validateRequired(
        { sessionId, taskId },
        ['sessionId', 'taskId']
      );
      if (validationError) return validationError;

      const removed = sessionDb.removeTask(sessionId, taskId);
      if (!removed) {
        return NextResponse.json(
          { error: 'Task not found in session' },
          { status: 404 }
        );
      }

      return successResponse({}, 'Task removed from session');
    }

    // Update Claude session ID
    if (action === 'update-claude-session-id') {
      const validationError = validateRequired(
        { sessionId, claudeSessionId },
        ['sessionId', 'claudeSessionId']
      );
      if (validationError) return validationError;

      const session = sessionDb.updateClaudeSessionId(sessionId, claudeSessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        session: toSessionResponse(session),
      });
    }

    // Update session status
    if (action === 'update-session-status') {
      const validationError = validateRequired(
        { sessionId, status },
        ['sessionId', 'status']
      );
      if (validationError) return validationError;

      const updated = sessionDb.updateStatus(sessionId, status as ClaudeCodeSessionStatus);
      if (!updated) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return successResponse({}, 'Session status updated');
    }

    // Update task status
    if (action === 'update-task-status') {
      const validationError = validateRequired(
        { sessionId, taskId, status },
        ['sessionId', 'taskId', 'status']
      );
      if (validationError) return validationError;

      // Find task by session and task ID
      const sessionTask = sessionDb.getTaskByTaskId(sessionId, taskId);
      if (!sessionTask) {
        return NextResponse.json(
          { error: 'Task not found in session' },
          { status: 404 }
        );
      }

      const updatedTask = sessionDb.updateTaskStatus(
        sessionTask.id,
        status as ClaudeCodeSessionTaskStatus,
        extras
      );

      if (!updatedTask) {
        return NextResponse.json(
          { error: 'Failed to update task status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        task: toSessionTaskResponse(updatedTask),
      });
    }

    // Update context tokens
    if (action === 'update-context-tokens') {
      const validationError = validateRequired(
        { sessionId, contextTokens },
        ['sessionId', 'contextTokens']
      );
      if (validationError) return validationError;

      const updated = sessionDb.updateContextTokens(sessionId, contextTokens);
      if (!updated) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return successResponse({}, 'Context tokens updated');
    }

    // Compact session (remove completed tasks)
    if (action === 'compact') {
      const validationError = validateRequired({ sessionId }, ['sessionId']);
      if (validationError) return validationError;

      sessionDb.compact(sessionId);

      const session = sessionDb.getById(sessionId);
      const tasks = session ? sessionDb.getTasksBySessionId(session.id) : [];

      return NextResponse.json({
        success: true,
        session: session ? toSessionResponse(session) : null,
        tasks: tasks.map(toSessionTaskResponse),
      });
    }

    // Get next pending task
    if (action === 'get-next-pending') {
      const validationError = validateRequired({ sessionId }, ['sessionId']);
      if (validationError) return validationError;

      const task = sessionDb.getNextPending(sessionId);
      return NextResponse.json({
        task: task ? toSessionTaskResponse(task) : null,
      });
    }

    // Get task stats
    if (action === 'get-task-stats') {
      const validationError = validateRequired({ sessionId }, ['sessionId']);
      if (validationError) return validationError;

      const stats = sessionDb.getTaskStats(sessionId);
      return NextResponse.json({ stats });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error, 'Error in POST /api/claude-code/sessions');
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

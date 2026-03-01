/**
 * POST /api/claude-code/tasks/:id/progress - Report structured progress
 *
 * Accepts progress reports from Claude Code via MCP bidirectional channel.
 * Injects structured progress events into the task's progress array,
 * allowing real-time status updates without parsing stream-json output.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { emitTaskChange } from '@/app/Claude/lib/taskChangeEmitter';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ProgressReport {
  /** Current phase: analyzing, planning, implementing, testing, validating */
  phase?: string;
  /** Human-readable status message */
  message: string;
  /** Progress percentage (0-100), optional */
  percentage?: number;
  /** Files being worked on */
  files?: string[];
  /** Structured metadata */
  metadata?: Record<string, unknown>;
}

async function handlePost(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: taskId } = await context.params;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const body: ProgressReport = await request.json();
    const { phase, message, percentage, files, metadata } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
    const task = executionQueue.getTask(taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build structured progress entry with MCP tag for identification
    const timestamp = new Date().toISOString();
    const parts: string[] = [`[${timestamp}]`, '[MCP]'];
    if (phase) parts.push(`[${phase}]`);
    if (percentage !== undefined) parts.push(`[${percentage}%]`);
    parts.push(message);
    if (files && files.length > 0) {
      parts.push(`| files: ${files.join(', ')}`);
    }

    const progressEntry = parts.join(' ');
    task.progress.push(progressEntry);

    // Notify SSE subscribers
    try {
      emitTaskChange({
        taskId: task.id,
        status: task.status,
        progressCount: task.progress.length,
        timestamp,
        // Include structured data for enhanced consumers
        mcpProgress: {
          phase: phase || undefined,
          message,
          percentage: percentage || undefined,
          files: files || undefined,
          metadata: metadata || undefined,
        },
      });
    } catch {
      // Notification must never break the progress report
    }

    return NextResponse.json({
      success: true,
      progressIndex: task.progress.length - 1,
    });
  } catch (error) {
    console.error('[Progress API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/claude-code/tasks/[id]/progress');

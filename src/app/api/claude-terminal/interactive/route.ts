/**
 * Interactive Claude Session API Route
 *
 * POST: Start a new interactive session (stdin kept open)
 * PUT: Write a message to an interactive session's stdin
 * GET: Check if session is alive + get latest events
 * DELETE: Abort an interactive session
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startInteractiveExecution,
  writeToExecution,
  isExecutionAlive,
  getExecution,
  abortExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig } from '@/lib/claude-terminal/types';

/**
 * POST: Start a new interactive Claude session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, provider, model } = body;

    if (!projectPath) {
      return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
    }

    const providerConfig: CLIProviderConfig | undefined =
      provider ? { provider, model: model || undefined } : undefined;

    const executionId = startInteractiveExecution(projectPath, providerConfig);

    return NextResponse.json({
      success: true,
      executionId,
      streamUrl: `/api/claude-terminal/stream?executionId=${executionId}`,
    });
  } catch (error) {
    console.error('Interactive session start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start interactive session' },
      { status: 500 },
    );
  }
}

/**
 * PUT: Write text to an interactive session's stdin.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, text } = body;

    if (!executionId || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'executionId and text are required' },
        { status: 400 },
      );
    }

    const ok = writeToExecution(executionId, text);
    if (!ok) {
      return NextResponse.json(
        { error: 'Session not found or stdin closed' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Interactive session write error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write to session' },
      { status: 500 },
    );
  }
}

/**
 * GET: Check if session is alive and get latest events.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  if (!executionId) {
    return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
  }

  const execution = getExecution(executionId);
  if (!execution) {
    return NextResponse.json({ alive: false, found: false });
  }

  const afterIdx = parseInt(searchParams.get('afterEventIndex') || '0', 10);
  const newEvents = execution.events.slice(afterIdx);

  return NextResponse.json({
    alive: isExecutionAlive(executionId),
    found: true,
    status: execution.status,
    sessionId: execution.sessionId,
    eventCount: execution.events.length,
    events: newEvents,
  });
}

/**
 * DELETE: Abort an interactive session.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  if (!executionId) {
    return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
  }

  const aborted = abortExecution(executionId);
  return NextResponse.json({ success: aborted });
}

/**
 * HTTP Hook Receiver: Task Stopped
 *
 * Called by Claude Code CLI (v2.1.63+) when a session stops.
 * Supplements process exit detection with faster lifecycle signaling.
 *
 * Hook payload includes session_id which maps to an execution via
 * the sessionToExecution registry in cli-service.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExecutionBySessionId } from '@/lib/claude-terminal/cli-service';

interface HookStopPayload {
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  reason?: string;
  exit_code?: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HookStopPayload;
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ received: true, matched: false });
    }

    // Validate hook secret
    const hookSecret = request.headers.get('x-hook-secret');
    const execution = getExecutionBySessionId(session_id);

    if (!execution) {
      console.debug(`[hook:stop] No execution found for session ${session_id}`);
      return NextResponse.json({ received: true, matched: false });
    }

    if (execution.hookSecret && hookSecret !== execution.hookSecret) {
      return NextResponse.json({ error: 'Invalid hook secret' }, { status: 401 });
    }

    // Only update if still running (idempotent — process exit may have already handled this)
    if (execution.status === 'running') {
      const isError = body.exit_code !== undefined && body.exit_code !== 0;
      execution.status = isError ? 'error' : 'completed';
      execution.endTime = Date.now();
      console.log(`[hook:stop] Session ${session_id} → execution ${execution.id} marked as ${execution.status}`);
    }

    return NextResponse.json({
      received: true,
      matched: true,
      executionId: execution.id,
    });
  } catch (error) {
    console.error('[hook:stop] Error processing hook:', error);
    return NextResponse.json(
      { error: 'Failed to process hook' },
      { status: 500 }
    );
  }
}

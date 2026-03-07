/**
 * HTTP Hook Receiver: Task Completed
 *
 * Called by Claude Code CLI (v2.1.63+) when a task completes.
 * Supplements process exit detection with faster lifecycle signaling.
 *
 * This endpoint is idempotent — if the execution was already marked
 * completed by the process exit handler, this is a no-op.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExecutionBySessionId } from '@/lib/claude-terminal/cli-service';

interface HookCompletedPayload {
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  result?: {
    success?: boolean;
    session_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HookCompletedPayload;
    const sessionId = body.session_id || body.result?.session_id;

    if (!sessionId) {
      return NextResponse.json({ received: true, matched: false });
    }

    // Validate hook secret
    const hookSecret = request.headers.get('x-hook-secret');
    const execution = getExecutionBySessionId(sessionId);

    if (!execution) {
      console.debug(`[hook:completed] No execution found for session ${sessionId}`);
      return NextResponse.json({ received: true, matched: false });
    }

    if (execution.hookSecret && hookSecret !== execution.hookSecret) {
      return NextResponse.json({ error: 'Invalid hook secret' }, { status: 401 });
    }

    // Only update if still running (idempotent)
    if (execution.status === 'running') {
      execution.status = 'completed';
      execution.endTime = Date.now();
      console.log(`[hook:completed] Session ${sessionId} → execution ${execution.id} marked as completed`);
    }

    return NextResponse.json({
      received: true,
      matched: true,
      executionId: execution.id,
    });
  } catch (error) {
    console.error('[hook:completed] Error processing hook:', error);
    return NextResponse.json(
      { error: 'Failed to process hook' },
      { status: 500 }
    );
  }
}

/**
 * Session Heartbeat API Route
 * POST /api/claude-code/sessions/heartbeat
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionRepository } from '@/app/db/repositories/session.repository';
import { logger } from '@/lib/logger';

/**
 * POST /api/claude-code/sessions/heartbeat
 * Update heartbeat timestamp for a session to prevent orphan detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const success = sessionRepository.updateHeartbeat(sessionId);

    if (!success) {
      logger.warn('Failed to update heartbeat - session not found', { sessionId });
    }

    return NextResponse.json({
      success,
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Failed to update session heartbeat', { error });
    return NextResponse.json({ error: 'Failed to update session heartbeat' }, { status: 500 });
  }
}

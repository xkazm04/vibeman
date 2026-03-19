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
 *
 * Returns:
 * - 200: heartbeat updated successfully
 * - 400: missing sessionId
 * - 404: session not found (possibly orphaned)
 * - 409: session exists but is in a terminal/inactive state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const result = sessionRepository.updateHeartbeat(sessionId);

    if (result === 'not_found') {
      logger.warn('Heartbeat failed - session not found', { sessionId });
      return NextResponse.json(
        { error: 'Session not found', sessionId },
        { status: 404 }
      );
    }

    if (result === 'inactive') {
      logger.warn('Heartbeat failed - session is inactive', { sessionId });
      return NextResponse.json(
        { error: 'Session is in an inactive state', sessionId },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Failed to update session heartbeat', { error });
    return NextResponse.json({ error: 'Failed to update session heartbeat' }, { status: 500 });
  }
}

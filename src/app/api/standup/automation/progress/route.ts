/**
 * Progress Update API
 * Endpoint for Claude Code to send progress updates during automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { automationSessionRepository } from '@/app/db/repositories/automation-session.repository';
import type { AutomationProgressUpdate, AutomationSessionPhase } from '@/lib/standupAutomation/types';

// In-memory progress tracking (session -> latest progress)
const progressCache = new Map<string, {
  progress: number;
  message: string;
  details?: Record<string, unknown>;
  updatedAt: string;
}>();

/**
 * POST /api/standup/automation/progress
 * Update progress of an automation session
 *
 * Body: AutomationProgressUpdate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AutomationProgressUpdate;
    const { sessionId, phase, progress, message, details } = body;

    // Validate required fields
    if (!sessionId || phase === undefined) {
      return NextResponse.json(
        { success: false, error: 'sessionId and phase are required' },
        { status: 400 }
      );
    }

    // Validate phase value
    const validPhases: AutomationSessionPhase[] = [
      'pending', 'running', 'exploring', 'generating', 'evaluating', 'complete', 'failed'
    ];
    if (!validPhases.includes(phase)) {
      return NextResponse.json(
        { success: false, error: `Invalid phase. Must be one of: ${validPhases.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the session
    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Automation session not found' },
        { status: 404 }
      );
    }

    // Update session phase if changed
    if (session.phase !== phase) {
      automationSessionRepository.updatePhase(sessionId, phase);
      logger.info('[Progress API] Phase updated', {
        sessionId,
        from: session.phase,
        to: phase,
      });
    }

    // Store progress in cache
    progressCache.set(sessionId, {
      progress: typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0,
      message: message || '',
      details,
      updatedAt: new Date().toISOString(),
    });

    // Log progress
    logger.debug('[Progress API] Progress update', {
      sessionId,
      phase,
      progress,
      message,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      phase,
      progress,
      message,
    });
  } catch (error) {
    logger.error('[Progress API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update progress',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/standup/automation/progress
 * Get progress of an automation session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId query parameter required' },
        { status: 400 }
      );
    }

    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const cachedProgress = progressCache.get(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      phase: session.phase,
      projectId: session.project_id,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      progress: cachedProgress?.progress || 0,
      message: cachedProgress?.message || '',
      details: cachedProgress?.details,
      lastUpdated: cachedProgress?.updatedAt,
      hasError: session.phase === 'failed',
      errorMessage: session.error_message,
    });
  } catch (error) {
    logger.error('[Progress API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get progress',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/standup/automation/progress
 * Clear progress cache for a session (cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      progressCache.delete(sessionId);
      return NextResponse.json({
        success: true,
        message: `Progress cache cleared for session ${sessionId}`,
      });
    }

    // Clear all if no sessionId specified (admin operation)
    const count = progressCache.size;
    progressCache.clear();
    return NextResponse.json({
      success: true,
      message: `Progress cache cleared (${count} entries)`,
    });
  } catch (error) {
    logger.error('[Progress API] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear progress',
      },
      { status: 500 }
    );
  }
}

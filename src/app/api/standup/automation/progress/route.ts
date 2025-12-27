/**
 * Progress Update API
 * Endpoint for Claude Code to send progress updates during automation
 * Supports both legacy progress updates and structured event submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { automationSessionRepository } from '@/app/db/repositories/automation-session.repository';
import { automationSessionEventRepository } from '@/app/db/repositories/automation-session-event.repository';
import type { AutomationProgressUpdate, AutomationSessionPhase } from '@/lib/standupAutomation/types';
import type {
  AutomationEventType,
  AutomationEventData,
  SubmitEventRequest,
  ProgressEventData,
  PhaseChangeEventData,
} from '@/app/db/models/automation-event.types';

// In-memory progress tracking (session -> latest progress)
const progressCache = new Map<string, {
  progress: number;
  message: string;
  details?: Record<string, unknown>;
  updatedAt: string;
}>();

// Event emitters for SSE (will be connected to stream endpoint)
type EventListener = (event: { sessionId: string; type: AutomationEventType; data: AutomationEventData }) => void;
const eventListeners = new Set<EventListener>();

export function addEventListener(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

function broadcastEvent(sessionId: string, type: AutomationEventType, data: AutomationEventData): void {
  for (const listener of eventListeners) {
    try {
      listener({ sessionId, type, data });
    } catch (error) {
      logger.error('[Progress API] Error broadcasting event:', error);
    }
  }
}

/**
 * POST /api/standup/automation/progress
 * Update progress of an automation session
 *
 * Supports two formats:
 * 1. Legacy: { sessionId, phase, progress, message, details }
 * 2. Structured: { sessionId, type, data }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Detect if this is a structured event or legacy progress update
    if ('type' in body && 'data' in body) {
      return handleStructuredEvent(body as SubmitEventRequest);
    } else {
      return handleLegacyProgress(body as AutomationProgressUpdate);
    }
  } catch (error) {
    logger.error('[Progress API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle structured event submission
 */
async function handleStructuredEvent(body: SubmitEventRequest) {
  const { sessionId, type, data } = body;

  // Validate required fields
  if (!sessionId || !type || !data) {
    return NextResponse.json(
      { success: false, error: 'sessionId, type, and data are required' },
      { status: 400 }
    );
  }

  // Validate event type
  const validTypes: AutomationEventType[] = [
    'file_read', 'finding', 'progress', 'candidate', 'evaluation', 'phase_change', 'error'
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
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

  // Persist event to database
  const event = automationSessionEventRepository.create({
    sessionId,
    eventType: type,
    data,
  });

  // Handle specific event types
  if (type === 'progress') {
    const progressData = data as ProgressEventData;
    progressCache.set(sessionId, {
      progress: progressData.progress ?? 0,
      message: progressData.message ?? '',
      details: progressData.details as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    });

    // Update phase if provided
    if (progressData.phase && progressData.phase !== session.phase) {
      automationSessionRepository.updatePhase(sessionId, progressData.phase);
    }
  } else if (type === 'phase_change') {
    const phaseData = data as PhaseChangeEventData;
    if (phaseData.newPhase && phaseData.newPhase !== session.phase) {
      automationSessionRepository.updatePhase(sessionId, phaseData.newPhase);
    }
  }

  // Broadcast event for SSE listeners
  broadcastEvent(sessionId, type, data);

  logger.debug('[Progress API] Event recorded', {
    sessionId,
    type,
    eventId: event.id,
  });

  return NextResponse.json({
    success: true,
    eventId: event.id,
    timestamp: event.timestamp,
    sessionId,
    type,
  });
}

/**
 * Handle legacy progress update format
 */
async function handleLegacyProgress(body: AutomationProgressUpdate) {
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

  // Handle phase change
  const previousPhase = session.phase;
  if (previousPhase !== phase) {
    automationSessionRepository.updatePhase(sessionId, phase);

    // Record phase change event
    const phaseChangeData: PhaseChangeEventData = {
      previousPhase,
      newPhase: phase,
    };
    automationSessionEventRepository.create({
      sessionId,
      eventType: 'phase_change',
      data: phaseChangeData,
    });
    broadcastEvent(sessionId, 'phase_change', phaseChangeData);

    logger.info('[Progress API] Phase updated', {
      sessionId,
      from: previousPhase,
      to: phase,
    });
  }

  // Store progress in cache and record event
  const normalizedProgress = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;
  const progressData: ProgressEventData = {
    progress: normalizedProgress,
    message: message || '',
    phase,
    details,
  };

  progressCache.set(sessionId, {
    progress: normalizedProgress,
    message: message || '',
    details,
    updatedAt: new Date().toISOString(),
  });

  // Record progress event
  automationSessionEventRepository.create({
    sessionId,
    eventType: 'progress',
    data: progressData,
  });
  broadcastEvent(sessionId, 'progress', progressData);

  logger.debug('[Progress API] Progress update', {
    sessionId,
    phase,
    progress: normalizedProgress,
    message,
  });

  return NextResponse.json({
    success: true,
    sessionId,
    phase,
    progress: normalizedProgress,
    message,
  });
}

/**
 * GET /api/standup/automation/progress
 * Get progress of an automation session
 *
 * Query params:
 * - sessionId: required
 * - includeEvents: optional, include event history
 * - eventType: optional, filter events by type
 * - after: optional, only events after this timestamp (for polling)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const includeEvents = searchParams.get('includeEvents') === 'true';
    const eventType = searchParams.get('eventType') as AutomationEventType | null;
    const after = searchParams.get('after');

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

    // Base response
    const response: Record<string, unknown> = {
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
    };

    // Include events if requested
    if (includeEvents) {
      const events = automationSessionEventRepository.getBySession(sessionId, {
        eventType: eventType || undefined,
        after: after || undefined,
      });
      response.events = events;
      response.eventCounts = automationSessionEventRepository.getCounts(sessionId);
    }

    return NextResponse.json(response);
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

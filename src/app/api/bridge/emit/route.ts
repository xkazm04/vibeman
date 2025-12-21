/**
 * Bridge API - Emit Event
 * POST: Emit an event to all SSE clients
 * Used by client-side code (TaskRunner) to broadcast events
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';
import { BridgeEventType } from '@/lib/bridge/types';

const VALID_EVENT_TYPES: BridgeEventType[] = [
  'idea_generated',
  'idea_updated',
  'batch_progress',
  'task_started',
  'task_completed',
  'task_failed',
  'goal_created',
  'goal_deleted',
  'error',
];

export async function POST(request: NextRequest) {
  // Auth check - also allow requests without API key for internal use
  // In production, you might want to use a different auth mechanism
  const authError = requireBridgeAuth(request);
  if (authError) {
    // Check for internal origin (same host)
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (!origin || !host || !origin.includes(host.split(':')[0])) {
      return authError;
    }
  }

  try {
    const body = await request.json();
    const { type, payload, projectId } = body;

    if (!type || !VALID_EVENT_TYPES.includes(type)) {
      return bridgeErrorResponse(`Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`, 400);
    }

    if (!projectId) {
      return bridgeErrorResponse('projectId is required', 400);
    }

    // Emit the event to all connected clients
    bridgeEvents.emit(type, payload, projectId);

    return bridgeSuccessResponse({
      success: true,
      type,
      projectId,
      clientsNotified: bridgeEvents.getProjectClients(projectId).length,
    });
  } catch (error) {
    console.error('[Bridge/Emit] POST error:', error);
    return bridgeErrorResponse('Failed to emit event', 500);
  }
}

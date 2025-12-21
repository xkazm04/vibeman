/**
 * Bridge API - Idea Actions
 * POST: Accept, reject, or skip an idea
 */

import { NextRequest } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';
import { IdeaActionRequest } from '@/lib/bridge/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body: IdeaActionRequest = await request.json();
    const { action } = body;

    if (!action || !['accept', 'reject', 'skip'].includes(action)) {
      return bridgeErrorResponse('Invalid action. Must be: accept, reject, or skip', 400);
    }

    // Get the idea first
    const existingIdea = ideaRepository.getIdeaById(id);
    if (!existingIdea) {
      return bridgeErrorResponse('Idea not found', 404);
    }

    // Map action to status
    let newStatus: 'pending' | 'accepted' | 'rejected';
    switch (action) {
      case 'accept':
        newStatus = 'accepted';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'skip':
        // Skip keeps it pending
        return bridgeSuccessResponse({ idea: existingIdea, action: 'skipped' });
      default:
        return bridgeErrorResponse('Invalid action', 400);
    }

    const previousStatus = existingIdea.status;
    const updatedIdea = ideaRepository.updateIdea(id, { status: newStatus });

    if (!updatedIdea) {
      return bridgeErrorResponse('Failed to update idea', 500);
    }

    // Emit event for SSE clients
    bridgeEvents.emit('idea_updated', {
      ideaId: id,
      status: newStatus,
      previousStatus,
    }, existingIdea.project_id);

    return bridgeSuccessResponse({ idea: updatedIdea, action });
  } catch (error) {
    console.error('[Bridge/Ideas] Action error:', error);
    return bridgeErrorResponse('Failed to perform action', 500);
  }
}

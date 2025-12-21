/**
 * Bridge API - Idea by ID
 * GET: Get a single idea
 * DELETE: Delete an idea
 */

import { NextRequest } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const idea = ideaRepository.getIdeaById(id);

    if (!idea) {
      return bridgeErrorResponse('Idea not found', 404);
    }

    return bridgeSuccessResponse({ idea });
  } catch (error) {
    console.error('[Bridge/Ideas] GET by ID error:', error);
    return bridgeErrorResponse('Failed to fetch idea', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const deleted = ideaRepository.deleteIdea(id);

    if (!deleted) {
      return bridgeErrorResponse('Idea not found', 404);
    }

    return bridgeSuccessResponse({ success: true });
  } catch (error) {
    console.error('[Bridge/Ideas] DELETE error:', error);
    return bridgeErrorResponse('Failed to delete idea', 500);
  }
}

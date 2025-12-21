/**
 * Bridge API - Ideas
 * GET: List ideas with filtering
 */

import { NextRequest } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') as 'pending' | 'accepted' | 'rejected' | 'implemented' | null;
    const contextId = searchParams.get('contextId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let ideas;

    if (contextId) {
      ideas = ideaRepository.getIdeasByContext(contextId);
    } else if (projectId) {
      ideas = ideaRepository.getIdeasByProjectWithColors(projectId);
    } else if (status) {
      ideas = ideaRepository.getIdeasByStatusWithColors(status);
    } else {
      ideas = ideaRepository.getAllIdeasWithColors();
    }

    // Apply status filter if projectId was used
    if (status && (projectId || contextId)) {
      ideas = ideas.filter(idea => idea.status === status);
    }

    // Apply pagination
    const total = ideas.length;
    ideas = ideas.slice(offset, offset + limit);

    return bridgeSuccessResponse({
      ideas,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Bridge/Ideas] GET error:', error);
    return bridgeErrorResponse('Failed to fetch ideas', 500);
  }
}

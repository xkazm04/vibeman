import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, contextDb } from '@/app/db';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  validateIdeasRequired,
  handleIdeasApiError,
  createIdeasSuccessResponse,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { signalCollector } from '@/lib/brain/signalCollector';
import { invalidateContextCache } from '@/lib/brain/brainService';

/**
 * POST /api/ideas/update-implementation-status
 * Update idea status to 'implemented' based on requirement name
 * Also increments the context's implemented_tasks counter if applicable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirementName } = body;

    const validationError = validateIdeasRequired({ requirementName }, ['requirementName']);
    if (validationError) return validationError;

    // Find idea by requirement_id
    const idea = ideaDb.getIdeaByRequirementId(requirementName);

    if (!idea) {
      // Not all tasks have associated ideas (e.g. direct prompts) — this is normal, not an error
      return createIdeasSuccessResponse(
        { updated: false, reason: 'no_matching_idea' },
        'No idea found with this requirement ID — skipping status update'
      );
    }

    // Update idea status to 'implemented'
    const updatedIdea = ideaDb.updateIdea(idea.id, { status: 'implemented' });

    if (!updatedIdea) {
      return createIdeasErrorResponse(IdeasErrorCode.UPDATE_FAILED, {
        details: `Failed to update idea status for id: ${idea.id}`,
      });
    }

    // Increment context's implemented_tasks counter if idea has a context
    let contextUpdated = false;
    if (idea.context_id) {
      const updatedContext = contextDb.incrementImplementedTasks(idea.context_id);
      contextUpdated = updatedContext !== null;
    }

    // Record brain signal: implementation completed
    try {
      signalCollector.recordImplementation(idea.project_id, {
        requirementId: idea.id,
        requirementName,
        contextId: idea.context_id || null,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        success: true,
        executionTimeMs: 0,
      });
      // Invalidate Brain context cache so dashboard reflects new signal
      invalidateContextCache(idea.project_id);
    } catch {
      // Signal recording must never break the main flow
    }

    return createIdeasSuccessResponse(
      { updated: true, ideaId: idea.id, contextUpdated },
      'Idea status updated to implemented'
    );
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.UPDATE_FAILED);
  }
}

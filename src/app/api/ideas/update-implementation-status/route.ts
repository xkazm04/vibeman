import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, contextDb } from '@/app/db';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  validateIdeasRequired,
  handleIdeasApiError,
  createIdeasSuccessResponse,
} from '@/app/features/Ideas/lib/ideasHandlers';

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
      return createIdeasErrorResponse(IdeasErrorCode.REQUIREMENT_NOT_FOUND, {
        details: `No idea found with requirement_id: ${requirementName}`,
      });
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

    return createIdeasSuccessResponse(
      { updated: true, ideaId: idea.id, contextUpdated },
      'Idea status updated to implemented'
    );
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.UPDATE_FAILED);
  }
}

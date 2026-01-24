import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { DbIdea } from '@/app/db/models/types';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  handleIdeasApiError,
  createIdeasSuccessResponse,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { withObservability } from '@/lib/observability/middleware';

/**
 * DELETE /api/contexts/ideas
 * Delete all ideas associated with a specific context_id
 * Also deletes any associated requirement files
 * Supports 'no-context' for deleting General ideas (null context_id)
 */
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const projectPath = searchParams.get('projectPath');

    if (!contextId) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
        field: 'contextId',
        message: 'contextId is required',
      });
    }

    // Handle 'no-context' for General ideas (null context_id)
    const isGeneralContext = contextId === 'no-context';

    // Get all ideas for this context
    const ideas = isGeneralContext
      ? ideaDb.getIdeasWithNullContext()
      : ideaDb.getIdeasByContext(contextId);

    // Delete requirement files if they exist and projectPath is provided
    if (projectPath) {
      await deleteRequirementFiles(ideas, projectPath);
    }

    // Delete all ideas from database
    const deletedCount = isGeneralContext
      ? ideaDb.deleteIdeasWithNullContext()
      : ideaDb.deleteIdeasByContext(contextId);

    return createIdeasSuccessResponse(
      { deletedCount },
      `Deleted ${deletedCount} idea(s) from context`
    );
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.DELETE_FAILED);
  }
}

/**
 * Delete requirement files associated with ideas
 */
async function deleteRequirementFiles(ideas: DbIdea[], projectPath: string): Promise<void> {
  for (const idea of ideas) {
    if (idea.requirement_id) {
      try {
        const deleteResult = deleteRequirement(projectPath, idea.requirement_id);
        if (!deleteResult.success) {
          // Log warning but continue with other deletions
        }
      } catch (deleteError) {
        // Continue with other deletions even if one fails
      }
    }
  }
}

export const DELETE = withObservability(handleDelete, '/api/contexts/ideas');

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { createErrorResponse, createSuccessResponse } from '../utils';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';

interface RejectIdeaRequest {
  ideaId: string;
  projectPath?: string;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): body is RejectIdeaRequest {
  const req = body as RejectIdeaRequest;
  return typeof req.ideaId === 'string' && req.ideaId.length > 0;
}

/**
 * Delete requirement file associated with an idea
 */
function tryDeleteRequirementFile(projectPath: string | undefined, requirementId: string | null): void {
  if (!requirementId || !projectPath) {
    return;
  }

  try {
    deleteRequirement(projectPath, requirementId);
  } catch {
    // Ignore errors - requirement deletion is not critical
  }
}

/**
 * POST /api/ideas/tinder/reject
 * Reject an idea and delete associated requirement file if it exists
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return createErrorResponse('ideaId is required', undefined, 400);
    }

    const { ideaId, projectPath } = body;

    // Get the idea to verify it exists
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return createErrorResponse('Idea not found', undefined, 404);
    }

    // Delete requirement file if it exists
    tryDeleteRequirementFile(projectPath, idea.requirement_id);

    // Update idea status to rejected and clear requirement_id
    ideaDb.updateIdea(ideaId, { status: 'rejected', requirement_id: null });

    // Record brain signal: idea rejected (negative signal)
    try {
      if (idea.project_id) {
        signalCollector.recordImplementation(idea.project_id, {
          requirementId: ideaId,
          requirementName: idea.title || ideaId,
          contextId: idea.context_id || null,
          filesCreated: [],
          filesModified: [],
          filesDeleted: [],
          success: false,
          executionTimeMs: 0,
          error: 'rejected_by_user',
        });
      }
    } catch {
      // Signal recording must never break the main flow
    }

    return createSuccessResponse({ message: 'Idea rejected' });
  } catch (error) {
    return createErrorResponse('Failed to reject idea', error);
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/ideas/tinder/reject');

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { createErrorResponse, createSuccessResponse } from '../utils';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

interface RejectIdeaRequest {
  ideaId: string;
  projectPath?: string;
  rejectionReason?: string;
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

    const { ideaId, projectPath, rejectionReason } = body;

    // Get the idea to verify it exists
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return createErrorResponse('Idea not found', undefined, 404);
    }

    // Verify project access
    if (idea.project_id) {
      const accessDenied = checkProjectAccess(idea.project_id, request);
      if (accessDenied) return accessDenied;
    }

    // Delete requirement file if it exists
    tryDeleteRequirementFile(projectPath, idea.requirement_id);

    // Update idea status to rejected and store rejection reason in user_feedback
    ideaDb.updateIdea(ideaId, {
      status: 'rejected',
      requirement_id: null,
      ...(rejectionReason ? { user_feedback: rejectionReason } : {}),
    });

    // Record brain signal: idea rejected (low-weight context preference)
    try {
      if (idea.project_id) {
        signalCollector.recordIdeaDecision(idea.project_id, {
          ideaId: idea.id,
          ideaTitle: idea.title || 'Untitled',
          category: idea.category || 'general',
          accepted: false,
          contextId: idea.context_id || null,
          contextName: null,
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

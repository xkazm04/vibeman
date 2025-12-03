import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, developerProfileDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { createErrorResponse, createSuccessResponse } from '../utils';
import { recordDecision } from '@/app/features/DeveloperMindMeld/lib/mindMeldAnalyzer';

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
export async function POST(request: NextRequest) {
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

    // Record decision for Mind-Meld learning (non-blocking)
    try {
      const profile = developerProfileDb.getByProject(idea.project_id);
      if (profile?.enabled) {
        await recordDecision(idea.project_id, {
          decisionType: 'idea_reject',
          entityId: idea.id,
          entityType: 'idea',
          scanType: idea.scan_type,
          category: idea.category,
          effort: idea.effort ?? undefined,
          impact: idea.impact ?? undefined,
          accepted: false,
        });
      }
    } catch (error) {
      // Non-blocking - don't fail the request if mind-meld recording fails
      console.error('[API] Mind-Meld recording failed:', error);
    }

    return createSuccessResponse({ message: 'Idea rejected' });
  } catch (error) {
    return createErrorResponse('Failed to reject idea', error);
  }
}

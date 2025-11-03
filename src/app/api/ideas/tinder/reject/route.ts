import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';

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
    const deleteResult = deleteRequirement(projectPath, requirementId);
    if (!deleteResult.success) {
      // Log but don't throw - requirement deletion is not critical
    }
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
      return NextResponse.json(
        { error: 'ideaId is required' },
        { status: 400 }
      );
    }

    const { ideaId, projectPath } = body;

    // Get the idea to verify it exists
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    // Delete requirement file if it exists
    tryDeleteRequirementFile(projectPath, idea.requirement_id);

    // Update idea status to rejected and clear requirement_id
    ideaDb.updateIdea(ideaId, { status: 'rejected', requirement_id: null });

    return NextResponse.json({
      success: true,
      message: 'Idea rejected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reject idea',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

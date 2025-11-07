import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, goalDb, contextDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementFromIdea } from '@/lib/scanner/reqFileBuilder';
import { createErrorResponse, createSuccessResponse } from '../utils';

interface AcceptIdeaRequest {
  ideaId: string;
  projectPath: string;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): body is AcceptIdeaRequest {
  const req = body as AcceptIdeaRequest;
  return typeof req.ideaId === 'string' && req.ideaId.length > 0 &&
         typeof req.projectPath === 'string' && req.projectPath.length > 0;
}

/**
 * Generate requirement file name from idea
 */
function generateRequirementName(ideaId: string, title: string): string {
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 30);
  return `idea-${ideaId.substring(0, 8)}-${sanitizedTitle}`;
}

/**
 * Fetch associated goal and context for an idea
 */
function fetchAssociatedData(goalId: string | null, contextId: string | null) {
  const goal = goalId ? goalDb.getGoalById(goalId) : null;
  const context = contextId ? contextDb.getContextById(contextId) : null;
  return { goal, context };
}

/**
 * Create requirement file and handle errors
 */
function createRequirementFile(
  projectPath: string,
  requirementName: string,
  content: string
): void {
  const createResult = createRequirement(projectPath, requirementName, content, true);

  if (!createResult.success) {
    throw new Error(createResult.error || 'Failed to create requirement');
  }
}

/**
 * POST /api/ideas/tinder/accept
 * Accept an idea and generate requirement file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return createErrorResponse('ideaId and projectPath are required', undefined, 400);
    }

    const { ideaId, projectPath } = body;

    // Get the idea
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return createErrorResponse('Idea not found', undefined, 404);
    }

    // Update idea status to accepted
    ideaDb.updateIdea(ideaId, { status: 'accepted' });

    // Generate requirement file name
    const requirementName = generateRequirementName(ideaId, idea.title);

    // Fetch goal and context if they exist
    const { goal, context } = fetchAssociatedData(idea.goal_id, idea.context_id);

    // Build requirement content using unified builder
    const content = buildRequirementFromIdea({
      idea,
      goal,
      context,
    });

    // Create requirement file (overwrite if exists)
    try {
      createRequirementFile(projectPath, requirementName, content);
    } catch (error) {
      // Rollback status change
      ideaDb.updateIdea(ideaId, { status: 'pending' });
      throw error;
    }

    // Update idea with requirement_id (the requirement file name)
    ideaDb.updateIdea(ideaId, { requirement_id: requirementName });

    return createSuccessResponse({
      requirementName,
      message: 'Idea accepted and requirement file created'
    });
  } catch (error) {
    return createErrorResponse('Failed to accept idea', error);
  }
}

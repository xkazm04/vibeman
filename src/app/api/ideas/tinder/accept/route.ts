import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, goalDb, contextDb, developerProfileDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementFromIdea } from '@/lib/scanner/reqFileBuilder';
import { wrapRequirementForExecution } from '@/lib/prompts/requirement_file';
import { createErrorResponse, createSuccessResponse } from '../utils';
import { recordDecision } from '@/app/features/DeveloperMindMeld/lib/mindMeldAnalyzer';

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

    // Validate required idea fields
    if (!idea.title || typeof idea.title !== 'string') {
      return createErrorResponse('Idea is missing required title field', undefined, 400);
    }

    // Validate project path
    if (!projectPath || typeof projectPath !== 'string') {
      return createErrorResponse('Invalid project path', undefined, 400);
    }

    // Update idea status to accepted
    try {
      ideaDb.updateIdea(ideaId, { status: 'accepted' });
    } catch (error) {
      console.error('[API] Failed to update idea status:', error);
      return createErrorResponse('Failed to update idea status in database', error);
    }

    // Generate requirement file name
    const requirementName = generateRequirementName(ideaId, idea.title);

    // Fetch goal and context if they exist
    let goal, context;
    try {
      const data = fetchAssociatedData(idea.goal_id, idea.context_id);
      goal = data.goal;
      context = data.context;
    } catch (error) {
      console.error('[API] Failed to fetch associated data:', error);
      // Continue without goal/context - they are optional
      goal = null;
      context = null;
    }

    // Build requirement content using unified builder
    let requirementContent: string;
    try {
      requirementContent = buildRequirementFromIdea({
        idea,
        goal,
        context,
      });
    } catch (error) {
      console.error('[API] Failed to build requirement content:', error);
      // Rollback status change
      try {
        ideaDb.updateIdea(ideaId, { status: 'pending' });
      } catch (rollbackError) {
        console.error('[API] Failed to rollback status:', rollbackError);
      }
      return createErrorResponse('Failed to generate requirement content', error);
    }

    // Wrap requirement content with execution instructions
    let wrappedContent: string;
    try {
      wrappedContent = wrapRequirementForExecution({
        requirementContent,
        projectPath,
        projectId: idea.project_id,
        contextId: idea.context_id || undefined,
        // Note: projectPort and runScript would come from project config if needed
      });
    } catch (error) {
      console.error('[API] Failed to wrap requirement content:', error);
      // Rollback status change
      try {
        ideaDb.updateIdea(ideaId, { status: 'pending' });
      } catch (rollbackError) {
        console.error('[API] Failed to rollback status:', rollbackError);
      }
      return createErrorResponse('Failed to wrap requirement content', error);
    }

    // Create requirement file (overwrite if exists)
    try {
      createRequirementFile(projectPath, requirementName, wrappedContent);
    } catch (error) {
      console.error('[API] Failed to create requirement file:', error);
      // Rollback status change
      try {
        ideaDb.updateIdea(ideaId, { status: 'pending' });
      } catch (rollbackError) {
        console.error('[API] Failed to rollback status:', rollbackError);
      }
      return createErrorResponse('Failed to create requirement file', error);
    }

    // Update idea with requirement_id (the requirement file name)
    try {
      ideaDb.updateIdea(ideaId, { requirement_id: requirementName });
    } catch (error) {
      console.error('[API] Failed to update idea with requirement_id:', error);
      // File is already created, so don't rollback status
      // Just log the error and continue
    }

    // Record decision for Mind-Meld learning (non-blocking)
    try {
      const profile = developerProfileDb.getByProject(idea.project_id);
      if (profile?.enabled) {
        await recordDecision(idea.project_id, {
          decisionType: 'idea_accept',
          entityId: idea.id,
          entityType: 'idea',
          scanType: idea.scan_type,
          category: idea.category,
          effort: idea.effort ?? undefined,
          impact: idea.impact ?? undefined,
          accepted: true,
        });
      }
    } catch (error) {
      // Non-blocking - don't fail the request if mind-meld recording fails
      console.error('[API] Mind-Meld recording failed:', error);
    }

    return createSuccessResponse({
      requirementName,
      message: 'Idea accepted and requirement file created'
    });
  } catch (error) {
    console.error('[API /ideas/tinder/accept] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Failed to accept idea', error);
  }
}

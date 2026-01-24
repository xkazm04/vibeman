import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, goalDb, contextDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementFromIdea } from '@/lib/scanner/reqFileBuilder';
import {
  wrapRequirementForExecution,
  wrapRequirementForMCP,
  type WrapperMode,
} from '@/lib/prompts/requirement_file';
import { createErrorResponse, createSuccessResponse } from '../utils';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';

interface AcceptIdeaRequest {
  ideaId: string;
  projectPath: string;
  /**
   * Wrapper mode for requirement generation:
   * - 'mcp': Compact wrapper with MCP tool references (default, ~115 tokens)
   * - 'full': Full wrapper with curl commands (~1780 tokens)
   */
  wrapperMode?: WrapperMode;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): body is AcceptIdeaRequest {
  const req = body as AcceptIdeaRequest;
  const hasValidIdea = typeof req.ideaId === 'string' && req.ideaId.length > 0;
  const hasValidPath = typeof req.projectPath === 'string' && req.projectPath.length > 0;
  const hasValidMode = req.wrapperMode === undefined ||
                       req.wrapperMode === 'mcp' ||
                       req.wrapperMode === 'full';
  return hasValidIdea && hasValidPath && hasValidMode;
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
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return createErrorResponse('ideaId and projectPath are required', undefined, 400);
    }

    const { ideaId, projectPath, wrapperMode = 'mcp' } = body;

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
      logger.error('[API] Failed to update idea status:', { error });
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
      logger.error('[API] Failed to fetch associated data:', { error });
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
      logger.error('[API] Failed to build requirement content:', { error });
      // Rollback status change
      try {
        ideaDb.updateIdea(ideaId, { status: 'pending' });
      } catch (rollbackError) {
        logger.error('[API] Failed to rollback status:', { rollbackError });
      }
      return createErrorResponse('Failed to generate requirement content', error);
    }

    // Wrap requirement content with execution instructions
    // Use compact MCP wrapper by default, or full wrapper for CLI execution
    let wrappedContent: string;
    try {
      if (wrapperMode === 'full') {
        // Full wrapper with curl commands for CLI execution (~1780 tokens)
        wrappedContent = wrapRequirementForExecution({
          requirementContent,
          projectPath,
          projectId: idea.project_id,
          contextId: idea.context_id || undefined,
        });
        logger.info('[API] Using full wrapper mode for idea', { ideaId, wrapperMode });
      } else {
        // Compact MCP wrapper for DualBatchPanel execution (~115 tokens)
        wrappedContent = wrapRequirementForMCP({
          requirementContent,
          projectId: idea.project_id,
          contextId: idea.context_id || undefined,
        });
        logger.info('[API] Using MCP wrapper mode for idea', { ideaId, wrapperMode });
      }
    } catch (error) {
      logger.error('[API] Failed to wrap requirement content:', { error, wrapperMode });
      // Rollback status change
      try {
        ideaDb.updateIdea(ideaId, { status: 'pending' });
      } catch (rollbackError) {
        logger.error('[API] Failed to rollback status:', { rollbackError });
      }
      return createErrorResponse('Failed to wrap requirement content', error);
    }

    // Create requirement file (overwrite if exists)
    try {
      createRequirementFile(projectPath, requirementName, wrappedContent);
    } catch (error) {
      logger.error('[API] Failed to create requirement file:', { error });
      // Rollback status change
      try {
        ideaDb.updateIdea(ideaId, { status: 'pending' });
      } catch (rollbackError) {
        logger.error('[API] Failed to rollback status:', { rollbackError });
      }
      return createErrorResponse('Failed to create requirement file', error);
    }

    // Update idea with requirement_id (the requirement file name)
    try {
      ideaDb.updateIdea(ideaId, { requirement_id: requirementName });
    } catch (error) {
      logger.error('[API] Failed to update idea with requirement_id:', { error });
      // File is already created, so don't rollback status
      // Just log the error and continue
    }

    // Record brain signal: idea accepted
    try {
      signalCollector.recordImplementation(idea.project_id, {
        requirementId: requirementName,
        requirementName,
        contextId: idea.context_id || null,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        success: true,
        executionTimeMs: 0,
      });
    } catch {
      // Signal recording must never break the main flow
    }

    return createSuccessResponse({
      requirementName,
      wrapperMode,
      message: `Idea accepted and requirement file created (${wrapperMode} mode)`
    });
  } catch (error) {
    logger.error('[API /ideas/tinder/accept] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Failed to accept idea', error);
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/ideas/tinder/accept');

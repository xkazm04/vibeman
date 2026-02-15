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
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { signalCollector } from '@/lib/brain/signalCollector';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

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

    // Verify project access
    if (idea.project_id) {
      const accessDenied = checkProjectAccess(idea.project_id, request);
      if (accessDenied) return accessDenied;
    }

    // Validate project path
    if (!projectPath || typeof projectPath !== 'string') {
      return createErrorResponse('Invalid project path', undefined, 400);
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
      return createErrorResponse('Failed to wrap requirement content', error);
    }

    // Create requirement file FIRST (before updating status)
    // This ensures we never have an accepted idea without its requirement file
    try {
      createRequirementFile(projectPath, requirementName, wrappedContent);
    } catch (error) {
      logger.error('[API] Failed to create requirement file:', { error });
      return createErrorResponse('Failed to create requirement file', error);
    }

    // Now that the file exists, update idea status to accepted with requirement_id
    // This is an atomic update - both fields in one call
    try {
      ideaDb.updateIdea(ideaId, { status: 'accepted', requirement_id: requirementName });
    } catch (error) {
      logger.error('[API] Failed to update idea status after file creation:', { error });
      // File exists but DB update failed - this is a minor inconsistency
      // The file is still valid and usable, user can re-accept to fix DB state
      return createErrorResponse(
        'Requirement file created but failed to update idea status. Re-accept the idea to fix.',
        error
      );
    }

    // Record brain signal: idea accepted (context preference)
    try {
      signalCollector.recordIdeaDecision(idea.project_id, {
        ideaId: idea.id,
        ideaTitle: idea.title || 'Untitled',
        category: idea.category || 'general',
        accepted: true,
        contextId: idea.context_id || null,
        contextName: context?.name || null,
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
export const POST = withObservability(withRateLimit(handlePost, '/api/ideas/tinder/accept', 'strict'), '/api/ideas/tinder/accept');

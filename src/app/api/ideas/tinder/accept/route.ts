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
import { ideaDependencyRepository } from '@/app/db/repositories/idea-dependency.repository';

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

    // Update idea status in DB FIRST (before writing file)
    // DB updates are rollback-safe; orphaned files on disk are not
    const previousStatus = idea.status;
    const previousRequirementId = idea.requirement_id;
    try {
      ideaDb.updateIdea(ideaId, { status: 'accepted', requirement_id: requirementName });
    } catch (error) {
      logger.error('[API] Failed to update idea status:', { error });
      return createErrorResponse('Failed to update idea status', error);
    }

    // Now write the requirement file to disk
    try {
      createRequirementFile(projectPath, requirementName, wrappedContent);
    } catch (error) {
      logger.error('[API] Failed to create requirement file, rolling back DB:', { error });
      // Roll back the DB change so there's no accepted idea without a file
      let rollbackSucceeded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          ideaDb.updateIdea(ideaId, { status: previousStatus, requirement_id: previousRequirementId ?? null });
          // Verify the rollback actually took effect
          const verifyIdea = ideaDb.getIdeaById(ideaId);
          if (verifyIdea && verifyIdea.status === previousStatus) {
            rollbackSucceeded = true;
            break;
          }
          logger.warn('[API] Rollback verification failed, retrying...', { attempt, ideaId });
        } catch (rollbackError) {
          logger.error('[API] Rollback attempt failed:', { rollbackError, attempt, ideaId });
        }
      }
      if (!rollbackSucceeded) {
        logger.error('[API] CRITICAL: Rollback failed after 3 attempts. Idea may be orphaned (accepted status without requirement file).', {
          ideaId,
          requirementName,
          previousStatus,
        });
      }
      return createErrorResponse('Failed to create requirement file', error);
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

    // Surface prerequisites and unlocked ideas for dependency awareness
    let prerequisites: { id: string; title: string; status: string; category: string }[] = [];
    let unlocks: { id: string; title: string; status: string; category: string }[] = [];
    try {
      const prereqs = ideaDependencyRepository.getPrerequisites(ideaId);
      prerequisites = prereqs.map(d => ({
        id: d.source_id,
        title: d.source_title,
        status: d.source_status,
        category: d.source_category,
      }));
      const unlockedIdeas = ideaDependencyRepository.getUnlockedByAccepting(ideaId);
      unlocks = unlockedIdeas.map(d => ({
        id: d.target_id,
        title: d.target_title,
        status: d.target_status,
        category: d.target_category,
      }));
    } catch {
      // Dependency surfacing must never break the accept flow
    }

    return createSuccessResponse({
      requirementName,
      wrapperMode,
      message: `Idea accepted and requirement file created (${wrapperMode} mode)`,
      prerequisites,
      unlocks,
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

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { type WrapperMode } from '@/lib/prompts/requirement_file';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';
import { acceptIdea } from '@/lib/ideas/ideaAcceptanceWorkflow';

interface AcceptIdeaRequest {
  ideaId: string;
  projectPath: string;
  wrapperMode?: WrapperMode;
}

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
 * POST /api/ideas/tinder/accept
 * Accept an idea and generate requirement file
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
        message: 'ideaId and projectPath are required',
      });
    }

    const { ideaId, projectPath, wrapperMode = 'mcp' } = body;

    // Verify project access (route-level concern, not workflow concern)
    const idea = ideaDb.getIdeaById(ideaId);
    if (idea?.project_id) {
      const accessDenied = checkProjectAccess(idea.project_id, request);
      if (accessDenied) return accessDenied;
    }

    const result = acceptIdea({ ideaId, projectPath, wrapperMode });

    if (!result.success) {
      const codeMap: Record<string, (typeof IdeasErrorCode)[keyof typeof IdeasErrorCode]> = {
        IDEA_NOT_FOUND: IdeasErrorCode.IDEA_NOT_FOUND,
        MISSING_FIELD: IdeasErrorCode.MISSING_REQUIRED_FIELD,
        BUILD_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
        WRAP_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
        DB_UPDATE_FAILED: IdeasErrorCode.UPDATE_FAILED,
        FILE_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
      };
      return createIdeasErrorResponse(
        codeMap[result.code] || IdeasErrorCode.CREATE_FAILED,
        { message: result.message },
      );
    }

    return NextResponse.json({
      success: true,
      requirementName: result.requirementName,
      wrapperMode: result.wrapperMode,
      message: `Idea accepted and requirement file created (${result.wrapperMode} mode)`,
      prerequisites: result.prerequisites,
      unlocks: result.unlocks,
    });
  } catch (error) {
    logger.error('[API /ideas/tinder/accept] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createIdeasErrorResponse(IdeasErrorCode.CREATE_FAILED, {
      message: 'Failed to accept idea',
      originalError: error,
    });
  }
}

export const POST = withObservability(withRateLimit(handlePost, '/api/ideas/tinder/accept', 'strict'), '/api/ideas/tinder/accept');

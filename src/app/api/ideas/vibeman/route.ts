import { NextRequest, NextResponse } from 'next/server';
import { getFirstAcceptedIdea, getAutomationStatus, markIdeaAsImplemented } from './lib/ideaHelpers';
import { evaluateAndSelectIdea } from './lib/ideaEvaluator';
import { implementIdea } from './lib/ideaImplementer';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  validateIdeasRequired,
  handleIdeasApiError,
} from '@/app/features/Ideas/lib/ideasHandlers';

interface VibemanRequest {
  projectId: string;
  projectPath: string;
  action: string;
  ideaId?: string;
}


/**
 * POST /api/ideas/vibeman
 * Automated project management - evaluates ideas and initiates implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body: VibemanRequest = await request.json();
    const { projectId, projectPath, action, ideaId } = body;

    // Validate required base fields
    const baseValidation = validateIdeasRequired(
      { projectId, projectPath },
      ['projectId', 'projectPath']
    );
    if (baseValidation) return baseValidation;

    // Route action to appropriate handler
    switch (action) {
      case 'get-first-accepted':
        return NextResponse.json(getFirstAcceptedIdea(projectId));

      case 'evaluate-and-select':
        return NextResponse.json(await evaluateAndSelectIdea(projectId, projectPath));

      case 'implement-idea': {
        const ideaValidation = validateIdeasRequired({ ideaId }, ['ideaId']);
        if (ideaValidation) return ideaValidation;
        return NextResponse.json(await implementIdea(ideaId!, projectPath));
      }

      case 'get-status':
        return NextResponse.json(getAutomationStatus(projectId));

      case 'mark-implemented': {
        const ideaValidation = validateIdeasRequired({ ideaId }, ['ideaId']);
        if (ideaValidation) return ideaValidation;
        return NextResponse.json(markIdeaAsImplemented(ideaId!));
      }

      default:
        return createIdeasErrorResponse(IdeasErrorCode.INVALID_ACTION, {
          details: `Unknown action: ${action}`,
        });
    }
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.INTERNAL_ERROR);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getFirstAcceptedIdea, getAutomationStatus, markIdeaAsImplemented } from './lib/ideaHelpers';
import { evaluateAndSelectIdea } from './lib/ideaEvaluator';
import { implementIdea } from './lib/ideaImplementer';

interface VibemanRequest {
  projectId: string;
  projectPath: string;
  action: string;
  ideaId?: string;
}

function validateRequest(body: Partial<VibemanRequest>): string | null {
  if (!body.projectId || !body.projectPath) {
    return 'projectId and projectPath are required';
  }
  return null;
}

function validateIdeaId(ideaId: string | undefined): string | null {
  if (!ideaId) {
    return 'ideaId is required';
  }
  return null;
}

/**
 * POST /api/ideas/vibeman
 * Automated project management - evaluates ideas and initiates implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body: VibemanRequest = await request.json();
    const { projectId, projectPath, action, ideaId } = body;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Route action to appropriate handler
    switch (action) {
      case 'get-first-accepted':
        return NextResponse.json(getFirstAcceptedIdea(projectId));

      case 'evaluate-and-select':
        return NextResponse.json(await evaluateAndSelectIdea(projectId, projectPath));

      case 'implement-idea': {
        const ideaError = validateIdeaId(ideaId);
        if (ideaError) {
          return NextResponse.json({ error: ideaError }, { status: 400 });
        }
        return NextResponse.json(await implementIdea(ideaId!, projectPath));
      }

      case 'get-status':
        return NextResponse.json(getAutomationStatus(projectId));

      case 'mark-implemented': {
        const ideaError = validateIdeaId(ideaId);
        if (ideaError) {
          return NextResponse.json({ error: ideaError }, { status: 400 });
        }
        return NextResponse.json(markIdeaAsImplemented(ideaId!));
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import {
  debateIdea,
  evaluateWithParliament,
} from '@/app/features/Parliament/lib/parliamentEvaluator';
import type { SupportedProvider } from '@/lib/llm/types';

/**
 * POST /api/parliament/debate
 * Start a parliament debate for an idea or evaluate multiple ideas
 *
 * Body:
 * - projectId: string (required)
 * - ideaId: string (optional - for single idea debate)
 * - enableDebate: boolean (optional, default: true)
 * - provider: string (optional, default: 'ollama')
 * - config: DebateConfig (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      ideaId,
      enableDebate = true,
      provider = 'ollama',
      config = {},
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Single idea debate
    if (ideaId) {
      const idea = ideaDb.getIdeaById(ideaId);
      if (!idea) {
        return NextResponse.json(
          { error: 'Idea not found' },
          { status: 404 }
        );
      }

      const result = await debateIdea(ideaId, projectId, {
        provider: provider as SupportedProvider,
        config,
      });

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to run debate' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        result,
        session: {
          id: result.sessionId,
          status: result.consensusReached ? 'consensus' : 'completed',
          rounds: [], // Simplified for API response
          votes: [result.agentVotes],
          tradeOffs: result.tradeOffs,
          consensusLevel: result.consensusLevel,
          selectedIdeaId: result.selectedIdeaId,
        },
      });
    }

    // Full evaluation with parliament
    const result = await evaluateWithParliament({
      projectId,
      projectPath: '', // Not needed for parliament evaluation
      enableDebate,
      provider: provider as SupportedProvider,
      debateConfig: config,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Parliament debate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/annette/chat
 * Main Annette chat endpoint
 *
 * Two modes:
 * - 'cli' (default): Spawns Claude CLI subprocess using user's subscription (no API credits)
 * - 'api': Direct Anthropic Messages API (Haiku, requires ANTHROPIC_API_KEY + credits)
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrate, ConversationMessage } from '@/lib/annette/orchestrator';
import { orchestrateCLI, clearProjectSession } from '@/lib/annette/cliOrchestrator';
import { analyzeAndUpdateRapport } from '@/lib/annette/rapportEngine';
import { withObservability } from '@/lib/observability/middleware';
import { logger } from '@/lib/logger';

interface ChatRequest {
  message: string;
  projectId: string;
  projectPath?: string;
  sessionId?: string;
  conversationHistory?: ConversationMessage[];
  audioMode?: boolean;
  /** Orchestration mode: 'api' uses Anthropic API (credits), 'cli' uses Claude CLI (subscription) */
  mode?: 'api' | 'cli';
  /** Clear the CLI session for this project (start fresh conversation) */
  clearSession?: boolean;
}

async function handlePost(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, projectId, projectPath, conversationHistory, audioMode, mode, clearSession } = body;

    if (!message || !projectId) {
      return NextResponse.json(
        { error: 'message and projectId are required' },
        { status: 400 }
      );
    }

    // Clear CLI session if requested (e.g., user clicked "clear chat")
    if (clearSession) {
      clearProjectSession(projectId);
    }

    const orchestrationMode = mode || 'cli';

    logger.info('Annette chat request', {
      projectId,
      messageLength: message.length,
      historyLength: conversationHistory?.length || 0,
      mode: orchestrationMode,
    });

    // Run orchestration based on mode
    const orchestratorInput = {
      message,
      projectId,
      projectPath,
      conversationHistory,
      audioMode,
    };

    const result = orchestrationMode === 'cli'
      ? await orchestrateCLI(orchestratorInput)
      : await orchestrate(orchestratorInput);

    logger.info('Annette chat response', {
      projectId,
      toolsUsed: result.toolsUsed.length,
      tokensUsed: result.tokensUsed.total,
      model: result.model,
    });

    // Update rapport model from this conversation turn (synchronous, self-guarded)
    analyzeAndUpdateRapport(projectId, [
      ...(conversationHistory || []).filter(m => m.role === 'user').map(m => m.content),
      message,
    ], [
      ...(conversationHistory || []).filter(m => m.role === 'assistant').map(m => m.content),
      result.response,
    ], result.toolsUsed);

    return NextResponse.json({
      response: result.response,
      quickOptions: result.quickOptions,
      toolsUsed: result.toolsUsed.map(t => ({
        name: t.name,
        input: t.input,
      })),
      tokensUsed: result.tokensUsed,
      model: result.model,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Annette chat error', { error });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/annette/chat');

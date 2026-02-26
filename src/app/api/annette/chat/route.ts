/**
 * POST /api/annette/chat
 * Main Annette 2.0 chat endpoint
 *
 * Receives user message, orchestrates with claude-haiku-4-5 + tool_use,
 * returns AI response with brain context awareness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrate, ConversationMessage } from '@/lib/annette/orchestrator';
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
}

async function handlePost(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, projectId, projectPath, conversationHistory, audioMode } = body;

    if (!message || !projectId) {
      return NextResponse.json(
        { error: 'message and projectId are required' },
        { status: 400 }
      );
    }

    logger.info('Annette chat request', {
      projectId,
      messageLength: message.length,
      historyLength: conversationHistory?.length || 0,
    });

    // Run orchestration
    const result = await orchestrate({
      message,
      projectId,
      projectPath,
      conversationHistory,
      audioMode,
    });

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

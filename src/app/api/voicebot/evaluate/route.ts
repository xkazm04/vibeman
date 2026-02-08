import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm/llm-manager';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const EVAL_MODEL = 'gemini-3-flash-preview';

/**
 * Evaluate conversation quality using Gemini 3 Flash
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'No evaluation prompt provided' },
        { status: 400 }
      );
    }

    const response = await llmManager.generate({
      prompt,
      provider: 'gemini',
      model: EVAL_MODEL,
      temperature: 0.7,
      maxTokens: 1024,
      systemPrompt: 'You are an AI conversation evaluator. Provide concise, structured evaluations.',
      taskType: 'conversation-evaluation',
      taskDescription: 'Evaluate voicebot conversation quality'
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || 'Evaluation failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluation: response.response,
      model: response.model,
      usage: response.usage
    });

  } catch (error) {
    logger.error('Evaluation API error:', { error });
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}

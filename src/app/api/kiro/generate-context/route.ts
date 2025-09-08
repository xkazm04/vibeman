import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '@/lib/ollama';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, projectId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Use the universal Ollama client
    const result = await ollamaClient.generate({
      prompt,
      model,
      projectId,
      taskType: 'context_generation',
      taskDescription: 'Generate context documentation'
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate context'
        },
        { status: result.errorCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: result.response,
      model: result.model,
      created_at: result.created_at,
      done: result.done,
      total_duration: result.total_duration,
      load_duration: result.load_duration,
      prompt_eval_count: result.prompt_eval_count,
      prompt_eval_duration: result.prompt_eval_duration,
      eval_count: result.eval_count,
      eval_duration: result.eval_duration
    });
  } catch (error) {
    console.error('Context generation API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
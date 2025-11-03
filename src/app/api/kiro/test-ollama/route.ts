import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '@/lib/ollama';

export async function POST(request: NextRequest) {
  try {
    const { projectId = 'test-project' } = await request.json();

    const result = await ollamaClient.generate({
      prompt: 'Say "Hello from the universal Ollama client!" and explain what you are in one sentence.',
      projectId,
      taskType: 'test',
      taskDescription: 'Testing the universal Ollama client'
    });

    return NextResponse.json({
      success: result.success,
      response: result.response,
      error: result.error,
      metrics: {
        total_duration: result.total_duration,
        eval_count: result.eval_count,
        model: result.model
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
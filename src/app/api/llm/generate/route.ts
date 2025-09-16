// Internal LLM API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model,
      maxTokens,
      temperature,
      systemPrompt,
      projectId,
      taskType,
      taskDescription,
      provider = 'ollama' // Default to ollama for internal API
    } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt is required and cannot be empty'
        },
        { status: 400 }
      );
    }

    // Use the LLM manager to generate response
    const response = await llmManager.generate({
      prompt,
      model,
      maxTokens,
      temperature,
      systemPrompt,
      projectId,
      taskType,
      taskDescription,
      provider
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || 'Generation failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      model: response.model,
      usage: response.usage,
      metadata: response.metadata
    });

  } catch (error) {
    console.error('Internal LLM API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
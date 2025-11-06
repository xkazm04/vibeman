// Internal LLM API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';

interface GenerateResponseData {
  response?: string;
  model?: string;
  usage?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

function validatePrompt(prompt?: string) {
  if (!prompt || prompt.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Prompt is required and cannot be empty'
      },
      { status: 400 }
    );
  }
  return null;
}

function createErrorResponse(error: string | unknown, statusCode = 500) {
  return NextResponse.json(
    {
      success: false,
      error: typeof error === 'string' ? error : (error instanceof Error ? error.message : 'Unknown error')
    },
    { status: statusCode }
  );
}

function createSuccessResponse(data: GenerateResponseData) {
  return NextResponse.json({
    success: true,
    response: data.response,
    model: data.model,
    usage: data.usage,
    metadata: data.metadata
  });
}

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
      provider = 'ollama'
    } = body;

    const validationError = validatePrompt(prompt);
    if (validationError) return validationError;

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
      return createErrorResponse(response.error || 'Generation failed');
    }

    return createSuccessResponse(response);

  } catch (error) {
    return createErrorResponse(error);
  }
}
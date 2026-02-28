// Internal LLM API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError } from '@/lib/api-errors';

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

function createErrorResponse(error: string, statusCode = 500) {
  return NextResponse.json(
    {
      success: false,
      error
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

async function handlePost(request: NextRequest) {
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
    return handleApiError(error, 'LLM generation');
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/llm/generate');
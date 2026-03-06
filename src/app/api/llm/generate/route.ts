// Internal LLM API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError, ApiErrorCode } from '@/lib/api-errors';
import { ErrorClassifier } from '@/lib/errorClassifier';
import { sanitizeErrorMessage } from '@/lib/api-helpers/errorSanitizer';

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
      // Classify the error from the LLM response for actionable user messaging
      const errorObj = new Error(response.error || 'Generation failed');
      if (response.errorCode) {
        (errorObj as any).status = response.errorCode;
      }
      const classified = ErrorClassifier.classify(errorObj);
      const status = response.errorCode || (classified.statusCode ?? 502);

      return NextResponse.json(
        {
          success: false,
          error: sanitizeErrorMessage(classified.userMessage),
          code: ApiErrorCode.LLM_ERROR,
          userMessage: classified.userMessage,
          recoveryActions: classified.recoveryActions,
          isTransient: classified.isTransient,
          retryDelay: classified.retryDelay,
          errorType: classified.type,
        },
        { status }
      );
    }

    return createSuccessResponse(response);

  } catch (error) {
    return handleApiError(error, 'LLM generation', ApiErrorCode.LLM_ERROR);
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/llm/generate');
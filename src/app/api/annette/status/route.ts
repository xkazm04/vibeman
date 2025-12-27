/**
 * Annette Status API
 *
 * Reports on untested implementation logs requiring user review
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createStatusPrompt,
  parseStatusResponse,
  StatusPromptData,
} from '@/app/features/Annette/prompts/statusPrompt';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { implementationLogDb } from '@/app/db';
import { logger } from '@/lib/logger';


interface StatusRequest {
  projectId: string;
  provider?: SupportedProvider;
  model?: string;
}

interface StatusResponse {
  success: boolean;
  response: string;      // Audio message
  metadata: {
    requiresReview: boolean;
    untestedCount: number;
    logIds: string[];
  };
  error?: string;
}

/**
 * POST /api/annette/status
 * Get status of untested implementation logs
 */
export async function POST(request: NextRequest) {
  try {
    const body: StatusRequest = await request.json();
    const { projectId, provider = 'gemini', model } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          response: '',
          metadata: {
            requiresReview: false,
            untestedCount: 0,
            logIds: [],
          },
          error: 'Missing required field: projectId',
        },
        { status: 400 }
      );
    }

    // 1. Fetch untested implementation logs
    const untestedLogs = implementationLogDb.getUntestedLogsByProject(projectId);
    const untestedCount = untestedLogs.length;

    // 2. Get recent logs for context
    const recentLogs = untestedLogs.slice(0, 5).map(log => ({
      id: log.id,
      title: log.title,
      requirement_name: log.requirement_name,
      created_at: log.created_at,
    }));

    // 3. Create prompt data
    const promptData: StatusPromptData = {
      untestedCount,
      recentLogs,
    };

    const prompt = createStatusPrompt(promptData);

    // 4. Call LLM to generate voice response
    if (provider === 'internal') {
      throw new Error('Internal provider is not supported for status');
    }

    const llmResult = await llmManager.generate({
      prompt,
      provider: provider as SupportedProvider,
      model: model || getDefaultModel(provider),
      taskType: 'status-report',
    });

    if (!llmResult.success || !llmResult.response) {
      throw new Error(llmResult.error || 'Failed to get LLM response');
    }

    // 5. Parse response and extract metadata
    const parsed = parseStatusResponse(llmResult.response, promptData);

    return NextResponse.json<StatusResponse>({
      success: true,
      response: parsed.audioMessage,
      metadata: parsed.metadata,
    });
  } catch (error) {
    logger.error('Status API error:', error);

    return NextResponse.json<StatusResponse>(
      {
        success: false,
        response: 'I encountered an error checking your implementation status. Please try again.',
        metadata: {
          requiresReview: false,
          untestedCount: 0,
          logIds: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    ollama: 'ministral-3:14b',
    openai: 'gpt-5-mini-2025-08-07',
    anthropic: 'claude-3-5-haiku-latest',
    gemini: 'gemini-flash-latest',
  };
  return defaults[provider] || defaults.gemini;
}

/**
 * Annette Analyze API
 *
 * Analyzes project context and proposes next steps (Refactoring, Fix, Improve)
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDb, implementationLogDb } from '@/app/db';
import {
  createAnalyzePrompt,
  parseAnalyzeResponse,
  AnalyzePromptData,
  AnalyzeActionType,
} from '@/app/features/Annette/prompts/analyzePrompt';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { logger } from '@/lib/logger';


interface AnalyzeRequest {
  projectId: string;
  contextId?: string;        // Optional: analyze specific context
  contextName?: string;      // Optional: find context by name
  provider?: SupportedProvider;
  model?: string;
}

interface AnalyzeResponse {
  success: boolean;
  response: string;          // Audio message
  metadata: {
    recommendedAction: AnalyzeActionType;
    contextId: string;
    contextName: string;
    requiresFollowUp: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  error?: string;
}

/**
 * POST /api/annette/analyze
 * Analyze context and recommend next steps
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { projectId, contextId, contextName, provider = 'gemini', model } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          response: '',
          metadata: {
            recommendedAction: 'improve',
            contextId: '',
            contextName: '',
            requiresFollowUp: false,
            priority: 'medium',
          },
          error: 'Missing required field: projectId',
        },
        { status: 400 }
      );
    }

    // 1. Get context to analyze
    let context;

    if (contextId) {
      // Get by ID
      context = contextDb.getContextById(contextId);
    } else if (contextName) {
      // Get by name
      const allContexts = contextDb.getContextsByProject(projectId);
      context = allContexts.find(c => c.name === contextName);
    } else {
      // Get the most recently updated context
      const allContexts = contextDb.getContextsByProject(projectId);
      if (allContexts.length === 0) {
        return NextResponse.json<AnalyzeResponse>(
          {
            success: false,
            response: 'No contexts found for this project. Please run a context scan first.',
            metadata: {
              recommendedAction: 'improve',
              contextId: '',
              contextName: '',
              requiresFollowUp: false,
              priority: 'medium',
            },
            error: 'No contexts available',
          },
          { status: 404 }
        );
      }

      // Sort by updated_at and get most recent
      context = allContexts.sort((a, b) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      )[0];
    }

    if (!context) {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          response: 'Context not found. Please specify a valid context.',
          metadata: {
            recommendedAction: 'improve',
            contextId: '',
            contextName: '',
            requiresFollowUp: false,
            priority: 'medium',
          },
          error: 'Context not found',
        },
        { status: 404 }
      );
    }

    // 2. Get additional context data
    const filesCount = context.file_paths ? JSON.parse(context.file_paths).length : 0;

    // Get untested logs for this context
    const untestedLogsForContext = implementationLogDb
      .getUntestedLogsByContext(context.id)
      .length;

    // 3. Create prompt data
    const promptData: AnalyzePromptData = {
      contextId: context.id,
      contextName: context.name,
      contextDescription: context.description || 'No description available',
      filesCount,
      untestedLogsForContext,
      // Could add more data like recent changes if available
    };

    const prompt = createAnalyzePrompt(promptData);

    // 4. Call LLM to generate analysis
    if (provider === 'internal') {
      throw new Error('Internal provider is not supported for analyze');
    }

    const llmResult = await llmManager.generate({
      prompt,
      provider: provider as SupportedProvider,
      model: model || getDefaultModel(provider),
      taskType: 'context-analysis',
    });

    if (!llmResult.success || !llmResult.response) {
      throw new Error(llmResult.error || 'Failed to get LLM response');
    }

    // 5. Parse response and extract metadata
    const parsed = parseAnalyzeResponse(llmResult.response, promptData);

    return NextResponse.json<AnalyzeResponse>({
      success: true,
      response: parsed.audioMessage,
      metadata: parsed.metadata,
    });
  } catch (error) {
    logger.error('Analyze API error:', error);

    return NextResponse.json<AnalyzeResponse>(
      {
        success: false,
        response: 'I encountered an error analyzing the context. Please try again.',
        metadata: {
          recommendedAction: 'improve',
          contextId: '',
          contextName: '',
          requiresFollowUp: false,
          priority: 'medium',
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
    anthropic: 'claude-haiku-4-5',
    gemini: 'gemini-3-flash-preview',
  };
  return defaults[provider] || defaults.gemini;
}

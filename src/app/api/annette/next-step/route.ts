/**
 * Annette Next Step Recommendation API
 *
 * Analyzes project statistics and recommends the next scan type to execute
 * based on the current state of ideas, contexts, and recent scan history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { contextDb } from '@/app/db';
import { eventRepository } from '@/app/db/repositories/event.repository';
import {
  createNextStepPrompt,
  parseNextStepResponse,
  SCAN_CAPABILITIES,
  NextStepPromptData,
} from '@/app/features/Annette/prompts/nextStepRecommendation';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';

interface NextStepRequest {
  projectId: string;
  provider?: SupportedProvider;
  model?: string;
}

interface NextStepResponse {
  success: boolean;
  response: string;
  scanType: string | null;
  reason: string;
  statistics: {
    ideasTotal: number;
    ideasAccepted: number;
    ideasPending: number;
    contextsCount: number;
    recentScansCount: number;
  };
  error?: string;
}

/**
 * POST /api/annette/next-step
 * Get recommendation for the next scan to execute
 */
export async function POST(request: NextRequest) {
  try {
    const body: NextStepRequest = await request.json();
    const { projectId, provider = 'gemini', model } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json<NextStepResponse>(
        {
          success: false,
          response: '',
          scanType: null,
          reason: '',
          statistics: {
            ideasTotal: 0,
            ideasAccepted: 0,
            ideasPending: 0,
            contextsCount: 0,
            recentScansCount: 0,
          },
          error: 'Missing required field: projectId',
        },
        { status: 400 }
      );
    }

    // 1. Fetch ideas statistics
    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const ideasAccepted = allIdeas.filter((i) => i.status === 'accepted').length;
    const ideasPending = allIdeas.filter((i) => i.status === 'pending').length;
    const ideasTotal = allIdeas.length;

    // 2. Fetch contexts count
    const allContexts = contextDb.getContextsByProject(projectId);
    const contextsCount = allContexts.length;

    // 3. Fetch recent scan events (last 10 scan-related events)
    const scanEventTitles = SCAN_CAPABILITIES.map((scan) => scan.eventTitle);
    const latestEvents = eventRepository.getLatestEventsByTitles(projectId, scanEventTitles);

    // Convert to array and sort by timestamp
    const recentScans = Object.entries(latestEvents)
      .filter(([_, event]) => event !== null)
      .map(([title, event]) => ({
        title: event!.title,
        description: event!.description,
        timestamp: event!.created_at,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5); // Keep only the 5 most recent

    // 4. Compose the prompt data
    const promptData: NextStepPromptData = {
      ideasAccepted,
      ideasPending,
      ideasTotal,
      contextsCount,
      recentScans,
      scanCapabilities: SCAN_CAPABILITIES,
    };

    const prompt = createNextStepPrompt(promptData);

    // 5. Call LLM to get recommendation
    if (provider === 'internal') {
      throw new Error('Internal provider is not supported for next-step recommendations');
    }
    const llmResult = await llmManager.generate({
      prompt,
      provider: provider as SupportedProvider,
      model: model || getDefaultModel(provider),
      taskType: 'next-step-recommendation',
    });

    if (!llmResult.success || !llmResult.response) {
      throw new Error(llmResult.error || 'Failed to get LLM response');
    }

    // 6. Parse the LLM response
    const parsed = parseNextStepResponse(llmResult.response);

    return NextResponse.json<NextStepResponse>({
      success: true,
      response: parsed.fullResponse,
      scanType: parsed.scanType,
      reason: parsed.reason,
      statistics: {
        ideasTotal,
        ideasAccepted,
        ideasPending,
        contextsCount,
        recentScansCount: recentScans.length,
      },
    });
  } catch (error) {

    return NextResponse.json<NextStepResponse>(
      {
        success: false,
        response: 'I encountered an error analyzing your project. Please try again.',
        scanType: null,
        reason: '',
        statistics: {
          ideasTotal: 0,
          ideasAccepted: 0,
          ideasPending: 0,
          contextsCount: 0,
          recentScansCount: 0,
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

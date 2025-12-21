import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm/llm-manager';
import {
  FEEDBACK_ANALYSIS_SYSTEM_PROMPT,
  REQUIREMENT_ANALYSIS_SYSTEM_PROMPT,
  generateAnalysisPrompt,
  generateRequirementAnalysisPrompt,
} from '@/app/features/Social/lib/config/aiPrompts';
import type { SupportedProvider } from '@/lib/llm/types';

interface FeedbackItemInput {
  id: string;
  channel: string;
  content: string;
  sentiment: string;
  priority: string;
  tags: string[];
  title?: string;
  classification?: string;
  bugReference?: string;
}

interface AnalyzeRequest {
  provider: 'gemini' | 'anthropic';
  feedbackItems: FeedbackItemInput[];
  stage?: 'classification' | 'requirement';
  codeContext?: {
    filePath: string;
    code: string;
  };
}

/**
 * POST /api/social/analyze
 * Analyze feedback items using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { provider, feedbackItems, stage = 'classification', codeContext } = body;

    if (!feedbackItems || feedbackItems.length === 0) {
      return NextResponse.json(
        { error: 'feedbackItems array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Map provider name to vibeman's provider type
    const vibemanProvider: SupportedProvider = provider === 'anthropic' ? 'anthropic' : 'gemini';

    // Check provider availability
    const isAvailable = await llmManager.checkProviderAvailability(vibemanProvider);
    if (!isAvailable) {
      return NextResponse.json(
        { error: `Provider '${vibemanProvider}' is not available. Please check API key configuration.` },
        { status: 503 }
      );
    }

    // Generate the appropriate prompt based on stage
    let prompt: string;
    let systemPrompt: string;

    if (stage === 'requirement') {
      // Stage 2: Requirement Analysis
      if (!codeContext) {
        // Use a default empty code context if not provided
        const defaultCodeContext = {
          filePath: 'src/app/page.tsx',
          code: '// No code context provided',
        };
        prompt = generateRequirementAnalysisPrompt(
          feedbackItems.map(item => ({
            ...item,
            title: item.title || 'Untitled',
            classification: (item.classification || 'bug') as 'bug' | 'feature' | 'clarification',
          })),
          defaultCodeContext
        );
      } else {
        prompt = generateRequirementAnalysisPrompt(
          feedbackItems.map(item => ({
            ...item,
            title: item.title || 'Untitled',
            classification: (item.classification || 'bug') as 'bug' | 'feature' | 'clarification',
          })),
          codeContext
        );
      }
      systemPrompt = REQUIREMENT_ANALYSIS_SYSTEM_PROMPT;
    } else {
      // Stage 1: Classification Analysis
      prompt = generateAnalysisPrompt(feedbackItems);
      systemPrompt = FEEDBACK_ANALYSIS_SYSTEM_PROMPT;
    }

    console.log(`[Social Analyze] Processing ${feedbackItems.length} items with ${vibemanProvider} (stage: ${stage})`);

    // Call the LLM
    const response = await llmManager.generate({
      prompt,
      systemPrompt,
      provider: vibemanProvider,
      maxTokens: 8192,
      temperature: 0.7,
      taskType: 'feedback-analysis',
    });

    if (!response.success || !response.response) {
      console.error('[Social Analyze] LLM generation failed:', response.error);
      return NextResponse.json(
        { error: response.error || 'Failed to generate analysis' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const parsed = llmManager.parseJsonResponse(response.response, vibemanProvider);

    if (!parsed.success) {
      console.error('[Social Analyze] Failed to parse JSON response:', parsed.error);
      console.error('[Social Analyze] Raw response:', response.response.substring(0, 500));

      // Try to extract JSON from the response manually
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[0]);
          console.log('[Social Analyze] Extracted JSON from response');
          return NextResponse.json(extractedData);
        } catch (e) {
          // Fall through to error
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to parse AI response as JSON',
          rawResponse: response.response.substring(0, 500),
        },
        { status: 500 }
      );
    }

    console.log(`[Social Analyze] Successfully processed ${feedbackItems.length} items`);

    return NextResponse.json(parsed.data);
  } catch (error) {
    console.error('[Social Analyze] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/analyze
 * Check AI analysis endpoint status
 */
export async function GET() {
  const geminiAvailable = await llmManager.checkProviderAvailability('gemini');
  const anthropicAvailable = await llmManager.checkProviderAvailability('anthropic');

  return NextResponse.json({
    status: 'ready',
    providers: {
      gemini: geminiAvailable ? 'available' : 'unavailable',
      anthropic: anthropicAvailable ? 'available' : 'unavailable',
    },
  });
}

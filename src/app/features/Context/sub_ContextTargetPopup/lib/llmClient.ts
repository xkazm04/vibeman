/**
 * LLM Client for Context Analysis
 *
 * Handles API communication with the LLM generation endpoint,
 * including progress tracking and error handling.
 */

import { SupportedProvider } from '@/lib/llm/types';

export interface GenerationOptions {
  prompt: string;
  provider: SupportedProvider;
  contextName: string;
  onProgress?: (message: string) => void;
}

export interface GenerationResult {
  success: boolean;
  target?: string;
  fulfillment?: string;
  error?: string;
}

/**
 * Generate context analysis using the LLM API
 *
 * @param options - Generation configuration
 * @returns Result with target and fulfillment or error
 */
export async function generateContextAnalysis(
  options: GenerationOptions
): Promise<GenerationResult> {
  const { prompt, provider, contextName, onProgress } = options;

  try {
    onProgress?.('Preparing analysis request...');

    // Call the LLM generation API endpoint
    onProgress?.('Sending request to AI provider...');

    const apiResponse = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider,
        maxTokens: 1500, // Increased for more comprehensive responses
        temperature: 0.7,
        systemPrompt: buildSystemPrompt(),
        taskType: 'context_business_analysis',
        taskDescription: `Analyzing business value and user productivity for context: ${contextName}`,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(
        errorData.error || `API request failed with status ${apiResponse.status}`
      );
    }

    onProgress?.('Processing AI response...');

    const response = await apiResponse.json();

    if (!response.success) {
      throw new Error(response.error || 'AI generation failed');
    }

    if (!response.response) {
      throw new Error('No response from AI provider');
    }

    onProgress?.('Parsing analysis results...');

    // Parse the JSON response
    const parsed = parseAnalysisResponse(response.response);

    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to parse AI response');
    }

    onProgress?.('Analysis complete!');

    return {
      success: true,
      target: parsed.target,
      fulfillment: parsed.fulfillment,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Build the system prompt that guides the AI's response style
 */
function buildSystemPrompt(): string {
  return `You are a strategic product analyst and business consultant specializing in software value creation.

Your expertise includes:
- Identifying competitive advantages and market differentiation
- Quantifying user productivity improvements
- Articulating strategic vision with concrete examples
- Providing honest, constructive feedback on current state
- Recommending high-impact improvements

Communication style:
- Clear, energizing language for vision/targets
- Honest, constructive language for current state assessment
- Focus on tangible user benefits and quantifiable outcomes
- Use specific examples and metrics when possible
- Be ambitious yet grounded in reality

Always return valid JSON without markdown formatting.`;
}

/**
 * Parse the AI response and extract target/fulfillment
 */
function parseAnalysisResponse(
  responseText: string
): { success: boolean; target?: string; fulfillment?: string; error?: string } {
  try {
    // Try to extract JSON from the response
    // Some LLMs wrap JSON in markdown code blocks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        success: false,
        error: 'No JSON object found in AI response',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.target || typeof parsed.target !== 'string') {
      return {
        success: false,
        error: 'Invalid response: missing or invalid "target" field',
      };
    }

    if (!parsed.fulfillment || typeof parsed.fulfillment !== 'string') {
      return {
        success: false,
        error: 'Invalid response: missing or invalid "fulfillment" field',
      };
    }

    // Validate content length (should be substantial)
    if (parsed.target.length < 50) {
      return {
        success: false,
        error: 'Target description is too short. AI may not have understood the request.',
      };
    }

    if (parsed.fulfillment.length < 50) {
      return {
        success: false,
        error: 'Fulfillment description is too short. AI may not have understood the request.',
      };
    }

    return {
      success: true,
      target: parsed.target.trim(),
      fulfillment: parsed.fulfillment.trim(),
    };
  } catch (parseError) {
    return {
      success: false,
      error: `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
    };
  }
}

/**
 * Test if a provider is likely to be available
 * (This is a client-side heuristic, actual availability is checked server-side)
 */
export function isProviderLikelyAvailable(provider: SupportedProvider): boolean {
  // All providers should be available if configured server-side
  // This is just for UI feedback
  const commonProviders: SupportedProvider[] = ['anthropic', 'openai', 'gemini', 'ollama'];
  return commonProviders.includes(provider);
}

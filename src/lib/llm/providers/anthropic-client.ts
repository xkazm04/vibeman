// Anthropic Claude client implementation

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  system?: string;
  temperature?: number;
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicClient extends BaseLLMClient {
  name = 'anthropic';

  constructor(config?: { apiKey?: string; baseUrl?: string; defaultModel?: string }) {
    super({
      baseUrl: config?.baseUrl || ANTHROPIC_BASE_URL,
      apiKey: config?.apiKey,
      defaultModel: config?.defaultModel || DEFAULT_MODEL
    });
  }

  async generate(request: LLMRequest, progress?: LLMProgress): Promise<LLMResponse> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();

    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check API key
      if (!this.apiKey) {
        throw new Error('Anthropic API key is required');
      }

      // Log start event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'info',
          title: 'Anthropic Generation Started',
          description: request.taskDescription || 'Anthropic generation task initiated',
          message: `Task: ${request.taskType || 'unknown'} | Model: ${request.model || this.defaultModel}`
        });
      }

      progress?.onStart?.(taskId);
      progress?.onProgress?.(10, 'Preparing request...');

      // Skip availability check - it causes more issues than it solves
      // Just proceed with the actual request and handle errors there
      // The availability check makes an extra API call and can fail for many reasons

      progress?.onProgress?.(20, 'Sending request to Claude...');

      // Prepare request body
      const requestBody: AnthropicRequest = {
        model: request.model || this.defaultModel || DEFAULT_MODEL,
        max_tokens: request.maxTokens || 40096,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        stream: false
      };

      if (request.systemPrompt) {
        requestBody.system = request.systemPrompt;
      }

      if (request.temperature !== undefined) {
        requestBody.temperature = request.temperature;
      }

      progress?.onProgress?.(40, 'Processing request...');

      const response = await this.makeRequest(
        `${this.baseUrl}/messages`,
        {
          method: 'POST',
          headers: this.createAnthropicHeaders(),
          body: JSON.stringify(requestBody)
        }
      );

      progress?.onProgress?.(70, 'Processing response...');

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = `Anthropic API error (${response.status}): ${errorText}`;

        // Parse Anthropic error format and provide helpful context
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // Use the raw error text
        }

        // Add context for common errors
        if (response.status === 401) {
          errorMessage = `Authentication failed: ${errorMessage}. Check your ANTHROPIC_API_KEY in .env file`;
        } else if (response.status === 429) {
          errorMessage = `Rate limit exceeded: ${errorMessage}. Please wait before making more requests`;
        } else if (response.status === 500) {
          errorMessage = `Anthropic service error: ${errorMessage}. This is a temporary issue with Anthropic's API`;
        } else if (response.status === 529) {
          errorMessage = `Anthropic service overloaded: ${errorMessage}. The API is temporarily unavailable`;
        }

        console.error(`[Anthropic] API Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const result: AnthropicResponse = await response.json();
      
      progress?.onProgress?.(90, 'Finalizing response...');

      const duration = Date.now() - startTime;
      const content = result.content[0]?.text || '';

      const llmResponse: LLMResponse = {
        success: true,
        response: content,
        model: result.model,
        provider: this.name,
        created_at: new Date().toISOString(),
        usage: {
          prompt_tokens: result.usage.input_tokens,
          completion_tokens: result.usage.output_tokens,
          total_tokens: result.usage.input_tokens + result.usage.output_tokens
        },
        metadata: {
          id: result.id,
          stop_reason: result.stop_reason,
          stop_sequence: result.stop_sequence
        }
      };

      // Log success event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'success',
          title: 'Anthropic Generation Completed',
          description: `Successfully generated ${content.length} characters`,
          message: JSON.stringify({
            taskType: request.taskType || 'unknown',
            duration,
            model: result.model,
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
            totalTokens: result.usage.input_tokens + result.usage.output_tokens,
            responseLength: content.length
          })
        });
      }

      progress?.onProgress?.(100, 'Complete');
      progress?.onComplete?.(llmResponse);
      
      return llmResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      const llmResponse = this.handleError(error, request.taskType);

      // Log error event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'error',
          title: 'Anthropic Generation Error',
          description: llmResponse.error || 'Unknown error',
          message: `Task: ${request.taskType || 'unknown'} | Duration: ${duration}ms | Error: ${llmResponse.error}`
        });
      }

      progress?.onError?.(llmResponse.error || 'Unknown error');
      return llmResponse;
    }
  }

  /**
   * Create Anthropic-specific headers with x-api-key instead of Authorization Bearer
   */
  private createAnthropicHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vibeman-LLM-Client/1.0',
      'anthropic-version': '2023-06-01'
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('[Anthropic] No API key configured');
        return false;
      }

      // Use a very short timeout for availability check (10 seconds)
      // This is only called explicitly, not on every generate() call
      const testResponse = await this.makeRequest(
        `${this.baseUrl}/messages`,
        {
          method: 'POST',
          headers: this.createAnthropicHeaders(),
          body: JSON.stringify({
            model: this.defaultModel || DEFAULT_MODEL,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        },
        10000 // 10 second timeout for availability check
      );

      if (testResponse.ok) {
        console.log('[Anthropic] Availability check passed');
        return true;
      } else {
        console.warn('[Anthropic] Availability check failed:', testResponse.status, testResponse.statusText);
        return false;
      }
    } catch (error) {
      console.warn('[Anthropic] Availability check error:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Anthropic doesn't provide a models endpoint
    // Return the known available models
    return [
      'claude-3-5-sonnet-20241022',
      'claude-haiku-4-5-20251001',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }
}
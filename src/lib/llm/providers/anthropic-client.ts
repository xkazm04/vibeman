// Anthropic Claude client implementation

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-3-haiku-20240307';

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
      progress?.onProgress?.(10, 'Connecting to Anthropic...');

      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Unable to connect to Anthropic API');
      }

      progress?.onProgress?.(20, 'Sending request to Claude...');

      // Prepare request body
      const requestBody: AnthropicRequest = {
        model: request.model || this.defaultModel || DEFAULT_MODEL,
        max_tokens: request.maxTokens || 4096,
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
          headers: this.createHeaders({
            'anthropic-version': '2023-06-01'
          }),
          body: JSON.stringify(requestBody)
        }
      );

      progress?.onProgress?.(70, 'Processing response...');

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = `Anthropic API error (${response.status}): ${errorText}`;
        
        // Parse Anthropic error format
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // Use the raw error text
        }

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

  async checkAvailability(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;

      // Anthropic doesn't have a simple health check endpoint
      // We'll make a minimal request to test connectivity
      const response = await this.makeRequest(
        `${this.baseUrl}/messages`,
        {
          method: 'POST',
          headers: this.createHeaders({
            'anthropic-version': '2023-06-01'
          }),
          body: JSON.stringify({
            model: this.defaultModel || DEFAULT_MODEL,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        },
        5000 // 5 second timeout for health check
      );

      // Even if the request fails due to rate limits or other issues,
      // if we get a response, the API is available
      return response.status !== 0;
    } catch (error) {
      console.warn('Anthropic availability check failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Anthropic doesn't provide a models endpoint
    // Return the known available models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
  }
}
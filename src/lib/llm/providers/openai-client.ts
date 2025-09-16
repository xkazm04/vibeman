// OpenAI/ChatGPT client implementation

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-3.5-turbo';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient extends BaseLLMClient {
  name = 'openai';

  constructor(config?: { apiKey?: string; baseUrl?: string; defaultModel?: string }) {
    super({
      baseUrl: config?.baseUrl || OPENAI_BASE_URL,
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
        throw new Error('OpenAI API key is required');
      }

      // Log start event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'info',
          title: 'OpenAI Generation Started',
          description: request.taskDescription || 'OpenAI generation task initiated',
          message: `Task: ${request.taskType || 'unknown'} | Model: ${request.model || this.defaultModel}`
        });
      }

      progress?.onStart?.(taskId);
      progress?.onProgress?.(10, 'Connecting to OpenAI...');

      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Unable to connect to OpenAI API');
      }

      progress?.onProgress?.(20, 'Sending request to OpenAI...');

      // Prepare messages
      const messages: OpenAIMessage[] = [];
      
      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: request.prompt
      });

      // Prepare request body
      const requestBody: OpenAIRequest = {
        model: request.model || this.defaultModel || DEFAULT_MODEL,
        messages,
        stream: false // We'll handle streaming separately if needed
      };

      if (request.maxTokens) {
        requestBody.max_tokens = request.maxTokens;
      }

      if (request.temperature !== undefined) {
        requestBody.temperature = request.temperature;
      }

      progress?.onProgress?.(40, 'Processing request...');

      const response = await this.makeRequest(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(requestBody)
        }
      );

      progress?.onProgress?.(70, 'Processing response...');

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = `OpenAI API error (${response.status}): ${errorText}`;
        
        // Parse OpenAI error format
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

      const result: OpenAIResponse = await response.json();
      
      progress?.onProgress?.(90, 'Finalizing response...');

      const duration = Date.now() - startTime;
      const content = result.choices[0]?.message?.content || '';

      const llmResponse: LLMResponse = {
        success: true,
        response: content,
        model: result.model,
        provider: this.name,
        created_at: new Date(result.created * 1000).toISOString(),
        usage: {
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens
        },
        metadata: {
          id: result.id,
          finish_reason: result.choices[0]?.finish_reason
        }
      };

      // Log success event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'success',
          title: 'OpenAI Generation Completed',
          description: `Successfully generated ${content.length} characters`,
          message: JSON.stringify({
            taskType: request.taskType || 'unknown',
            duration,
            model: result.model,
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
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
          title: 'OpenAI Generation Error',
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

      const response = await this.makeRequest(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.createHeaders()
        },
        5000 // 5 second timeout for health check
      );

      return response.ok;
    } catch (error) {
      console.warn('OpenAI availability check failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      if (!this.apiKey) return [];

      const response = await this.makeRequest(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.createHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data
        ?.filter((model: any) => model.id.includes('gpt'))
        ?.map((model: any) => model.id)
        ?.sort() || [];
    } catch (error) {
      console.error('Failed to get OpenAI models:', error);
      return [];
    }
  }
}
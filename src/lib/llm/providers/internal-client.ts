// Internal API client implementation

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';

const INTERNAL_BASE_URL = '/api/llm';
const DEFAULT_MODEL = 'internal-default';

interface InternalRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  projectId?: string;
  taskType?: string;
  taskDescription?: string;
}

interface InternalResponse {
  success: boolean;
  response?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: string;
  metadata?: Record<string, any>;
}

export class InternalClient extends BaseLLMClient {
  name = 'internal';

  constructor(config?: { baseUrl?: string; defaultModel?: string }) {
    super({
      baseUrl: config?.baseUrl || INTERNAL_BASE_URL,
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

      // Log start event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'info',
          title: 'Internal API Generation Started',
          description: request.taskDescription || 'Internal API generation task initiated',
          message: `Task: ${request.taskType || 'unknown'} | Model: ${request.model || this.defaultModel}`
        });
      }

      progress?.onStart?.(taskId);
      progress?.onProgress?.(10, 'Connecting to internal API...');

      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Unable to connect to internal API');
      }

      progress?.onProgress?.(20, 'Sending request to internal API...');

      // Prepare request body
      const requestBody: InternalRequest = {
        prompt: request.prompt,
        model: request.model || this.defaultModel,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        systemPrompt: request.systemPrompt,
        projectId: request.projectId,
        taskType: request.taskType,
        taskDescription: request.taskDescription
      };

      progress?.onProgress?.(40, 'Processing request...');

      const response = await this.makeRequest(
        `${this.baseUrl}/generate`,
        {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(requestBody)
        }
      );

      progress?.onProgress?.(70, 'Processing response...');

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = `Internal API error (${response.status}): ${errorText}`;
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Use the raw error text
        }

        throw new Error(errorMessage);
      }

      const result: InternalResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Internal API request failed');
      }

      progress?.onProgress?.(90, 'Finalizing response...');

      const duration = Date.now() - startTime;
      const content = result.response || '';

      const llmResponse: LLMResponse = {
        success: true,
        response: content,
        model: result.model || request.model || this.defaultModel,
        provider: this.name,
        created_at: new Date().toISOString(),
        usage: result.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        metadata: {
          ...result.metadata,
          duration
        }
      };

      // Log success event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'success',
          title: 'Internal API Generation Completed',
          description: `Successfully generated ${content.length} characters`,
          message: JSON.stringify({
            taskType: request.taskType || 'unknown',
            duration,
            model: result.model || request.model || this.defaultModel,
            promptTokens: result.usage?.prompt_tokens || 0,
            completionTokens: result.usage?.completion_tokens || 0,
            totalTokens: result.usage?.total_tokens || 0,
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
          title: 'Internal API Generation Error',
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
      const response = await this.makeRequest(
        `${this.baseUrl}/health`,
        {
          method: 'GET',
          headers: this.createHeaders()
        },
        5000 // 5 second timeout for health check
      );

      return response.ok;
    } catch (error) {
      console.warn('Internal API availability check failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
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
      return data.models || [];
    } catch (error) {
      console.error('Failed to get internal API models:', error);
      return [];
    }
  }
}
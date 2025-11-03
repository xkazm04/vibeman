// Ollama client implementation (wrapper around existing client)

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';
import { OllamaClient as OriginalOllamaClient } from '../../ollama';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

export class OllamaClient extends BaseLLMClient {
  name = 'ollama';
  private client: OriginalOllamaClient;

  constructor(config?: { baseUrl?: string; defaultModel?: string }) {
    super({
      baseUrl: config?.baseUrl || OLLAMA_BASE_URL,
      defaultModel: config?.defaultModel || DEFAULT_MODEL
    });
    
    this.client = new OriginalOllamaClient(
      this.baseUrl || OLLAMA_BASE_URL,
      this.defaultModel || DEFAULT_MODEL
    );
  }

  private convertOllamaToLLMResponse(response: any): LLMResponse {
    return {
      success: response.success,
      response: response.response,
      model: response.model,
      provider: this.name,
      created_at: response.created_at,
      usage: {
        prompt_tokens: response.prompt_eval_count,
        completion_tokens: response.eval_count,
        total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      },
      error: response.error,
      errorCode: response.errorCode,
      metadata: {
        total_duration: response.total_duration,
        load_duration: response.load_duration,
        prompt_eval_duration: response.prompt_eval_duration,
        eval_duration: response.eval_duration,
        done: response.done
      }
    };
  }

  async generate(request: LLMRequest, progress?: LLMProgress): Promise<LLMResponse> {
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Convert LLMRequest to OllamaRequest format
      const ollamaRequest = {
        prompt: request.prompt,
        model: request.model || this.defaultModel,
        stream: request.stream || false,
        projectId: request.projectId,
        taskType: request.taskType,
        taskDescription: request.taskDescription
      };

      // Convert LLMProgress to OllamaProgress format
      const ollamaProgress = progress ? {
        onStart: progress.onStart,
        onProgress: progress.onProgress,
        onComplete: (response: any) => {
          const llmResponse = this.convertOllamaToLLMResponse(response);
          progress.onComplete?.(llmResponse);
        },
        onError: progress.onError
      } : undefined;

      // Use the original Ollama client
      const ollamaResponse = await this.client.generate(ollamaRequest, ollamaProgress);

      // Convert OllamaResponse to LLMResponse
      return this.convertOllamaToLLMResponse(ollamaResponse);

    } catch (error) {
      return this.handleError(error, request.taskType);
    }
  }

  async checkAvailability(): Promise<boolean> {
    return await this.client.checkOllamaAvailability();
  }

  async getAvailableModels(): Promise<string[]> {
    return await this.client.getAvailableModels();
  }

  // Override parseJsonResponse to use the original client's implementation
  parseJsonResponse<T = any>(response: string): { success: boolean; data?: T; error?: string } {
    return this.client.parseJsonResponse<T>(response);
  }
}
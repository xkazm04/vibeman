// Google Gemini client implementation

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-1.5-flash';

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
    role?: string;
  }>;
  systemInstruction?: {
    parts: Array<{
      text: string;
    }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiClient extends BaseLLMClient {
  name = 'gemini';

  constructor(config?: { apiKey?: string; baseUrl?: string; defaultModel?: string }) {
    super({
      baseUrl: config?.baseUrl || GEMINI_BASE_URL,
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
        throw new Error('Google Gemini API key is required');
      }

      // Log start event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'info',
          title: 'Gemini Generation Started',
          description: request.taskDescription || 'Gemini generation task initiated',
          message: `Task: ${request.taskType || 'unknown'} | Model: ${request.model || this.defaultModel}`
        });
      }

      progress?.onStart?.(taskId);
      progress?.onProgress?.(10, 'Connecting to Gemini...');

      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Unable to connect to Google Gemini API');
      }

      progress?.onProgress?.(20, 'Sending request to Gemini...');

      // Prepare request body
      const requestBody: GeminiRequest = {
        contents: [
          {
            parts: [
              {
                text: request.prompt
              }
            ]
          }
        ]
      };

      if (request.systemPrompt) {
        requestBody.systemInstruction = {
          parts: [
            {
              text: request.systemPrompt
            }
          ]
        };
      }

      if (request.temperature !== undefined || request.maxTokens !== undefined) {
        requestBody.generationConfig = {};
        
        if (request.temperature !== undefined) {
          requestBody.generationConfig.temperature = request.temperature;
        }
        
        if (request.maxTokens !== undefined) {
          requestBody.generationConfig.maxOutputTokens = request.maxTokens;
        }
      }

      progress?.onProgress?.(40, 'Processing request...');

      const model = request.model || this.defaultModel || DEFAULT_MODEL;
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

      const response = await this.makeRequest(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      progress?.onProgress?.(70, 'Processing response...');

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = `Gemini API error (${response.status}): ${errorText}`;
        
        // Parse Gemini error format
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

      const result: GeminiResponse = await response.json();
      
      progress?.onProgress?.(90, 'Finalizing response...');

      const duration = Date.now() - startTime;
      const content = result.candidates[0]?.content?.parts[0]?.text || '';

      const llmResponse: LLMResponse = {
        success: true,
        response: content,
        model: model,
        provider: this.name,
        created_at: new Date().toISOString(),
        usage: {
          prompt_tokens: result.usageMetadata?.promptTokenCount || 0,
          completion_tokens: result.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: result.usageMetadata?.totalTokenCount || 0
        },
        metadata: {
          finishReason: result.candidates[0]?.finishReason,
          safetyRatings: result.candidates[0]?.safetyRatings
        }
      };

      // Log success event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'success',
          title: 'Gemini Generation Completed',
          description: `Successfully generated ${content.length} characters`,
          message: JSON.stringify({
            taskType: request.taskType || 'unknown',
            duration,
            model: model,
            promptTokens: result.usageMetadata?.promptTokenCount || 0,
            completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata?.totalTokenCount || 0,
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
          title: 'Gemini Generation Error',
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

      const model = this.defaultModel || DEFAULT_MODEL;
      const url = `${this.baseUrl}/models/${model}?key=${this.apiKey}`;

      const response = await this.makeRequest(
        url,
        {
          method: 'GET'
        },
        5000 // 5 second timeout for health check
      );

      return response.ok;
    } catch (error) {
      // Silent fail for availability check
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      if (!this.apiKey) return [];

      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      const response = await this.makeRequest(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();

      interface GeminiModelInfo {
        name: string;
        baseModelId?: string;
        version?: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
      }

      return data.models
        ?.filter((model: GeminiModelInfo) => model.name.includes('gemini') && model.supportedGenerationMethods?.includes('generateContent'))
        ?.map((model: GeminiModelInfo) => model.name.replace('models/', ''))
        ?.sort() || [];
    } catch (error) {
      // Return known models as fallback
      return [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
      ];
    }
  }
}
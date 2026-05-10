// Anthropic Claude client — SDK-backed implementation

import Anthropic from '@anthropic-ai/sdk';

import { BaseLLMClient } from '../base-client';
import { LLMRequest, LLMResponse, LLMProgress } from '../types';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export class AnthropicClient extends BaseLLMClient {
  name = 'anthropic';
  private client?: Anthropic;

  constructor(config?: { apiKey?: string; baseUrl?: string; defaultModel?: string }) {
    super({
      baseUrl: config?.baseUrl,
      apiKey: config?.apiKey,
      defaultModel: config?.defaultModel || DEFAULT_MODEL,
    });

    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
        // Preserves the legacy browser code path in llm-manager.ts:69-98.
        // The API key was already exposed client-side via fetch; the SDK
        // just needs this flag to allow the same usage pattern.
        dangerouslyAllowBrowser: typeof window !== 'undefined',
      });
    }
  }

  async generate(request: LLMRequest, progress?: LLMProgress): Promise<LLMResponse> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();

    try {
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (!this.client) {
        throw new Error('Anthropic API key is required');
      }

      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'info',
          title: 'Anthropic Generation Started',
          description: request.taskDescription || 'Anthropic generation task initiated',
          message: `Task: ${request.taskType || 'unknown'} | Model: ${request.model || this.defaultModel}`,
        });
      }

      progress?.onStart?.(taskId);
      progress?.onProgress?.(10, 'Preparing request...');
      progress?.onProgress?.(40, 'Sending request to Claude...');

      const result = await this.client.messages.create({
        model: request.model || this.defaultModel || DEFAULT_MODEL,
        max_tokens: request.maxTokens || 40096,
        messages: [{ role: 'user', content: request.prompt }],
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      });

      progress?.onProgress?.(80, 'Processing response...');

      const duration = Date.now() - startTime;
      const textBlock = result.content.find((b) => b.type === 'text');
      const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      const llmResponse: LLMResponse = {
        success: true,
        response: content,
        model: result.model,
        provider: this.name,
        created_at: new Date().toISOString(),
        usage: {
          prompt_tokens: result.usage.input_tokens,
          completion_tokens: result.usage.output_tokens,
          total_tokens: result.usage.input_tokens + result.usage.output_tokens,
        },
        metadata: {
          id: result.id,
          stop_reason: result.stop_reason,
          stop_sequence: result.stop_sequence,
          cache_creation_input_tokens: result.usage.cache_creation_input_tokens ?? null,
          cache_read_input_tokens: result.usage.cache_read_input_tokens ?? null,
        },
      };

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
            responseLength: content.length,
          }),
        });
      }

      progress?.onProgress?.(100, 'Complete');
      progress?.onComplete?.(llmResponse);
      return llmResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      const llmResponse = this.handleError(normalizeSDKError(error), request.taskType);

      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'error',
          title: 'Anthropic Generation Error',
          description: llmResponse.error || 'Unknown error',
          message: `Task: ${request.taskType || 'unknown'} | Duration: ${duration}ms | Error: ${llmResponse.error}`,
        });
      }

      progress?.onError?.(llmResponse.error || 'Unknown error');
      return llmResponse;
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.messages.create(
        {
          model: this.defaultModel || DEFAULT_MODEL,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        },
        { timeout: 10000 },
      );
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
  }

  /**
   * Exposes the underlying SDK client so callers (e.g. conductor/usage) can
   * call countTokens and read rate-limit headers without duplicating setup.
   */
  getSDKClient(): Anthropic | undefined {
    return this.client;
  }
}

/**
 * Map SDK errors into shapes BaseLLMClient.handleError already recognizes.
 * Anthropic.APIError carries .status; prepending it keeps the existing
 * substring-match logic in handleError working unchanged.
 */
function normalizeSDKError(error: unknown): Error {
  if (error instanceof Anthropic.APIError) {
    const status = (error as unknown as { status?: number }).status;
    const wrapped = new Error(status ? `${status}: ${error.message}` : error.message);
    wrapped.name = error.name;
    return wrapped;
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

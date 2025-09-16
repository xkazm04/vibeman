// Base client class with common functionality for all LLM providers

import { LLMRequest, LLMResponse, LLMProgress, LLMProvider } from './types';

// Import eventDb only on server side to avoid client-side issues
let eventDb: any = null;
if (typeof window === 'undefined') {
  try {
    eventDb = require('../eventDatabase').eventDb;
  } catch (error) {
    console.warn('EventDb not available:', error);
  }
}

export abstract class BaseLLMClient implements LLMProvider {
  abstract name: string;
  protected baseUrl?: string;
  protected apiKey?: string;
  protected defaultModel?: string;

  constructor(config?: { baseUrl?: string; apiKey?: string; defaultModel?: string }) {
    this.baseUrl = config?.baseUrl;
    this.apiKey = config?.apiKey;
    this.defaultModel = config?.defaultModel;
  }

  abstract generate(request: LLMRequest, progress?: LLMProgress): Promise<LLMResponse>;
  abstract checkAvailability(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;

  /**
   * Parse JSON response with fallback handling
   */
  parseJsonResponse<T = any>(response: string): { success: boolean; data?: T; error?: string } {
    try {
      // Try to extract JSON from markdown code blocks first
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/```\s*([\s\S]*?)\s*```/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      const data = JSON.parse(jsonString.trim());
      
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Generate a unique task ID for tracking
   */
  protected generateTaskId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log events to the database (server-side only)
   */
  protected async logEvent(projectId: string, event: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    description: string;
    agent?: string;
    message?: string;
  }): Promise<void> {
    try {
      // Only log events on server side
      if (typeof window === 'undefined' && eventDb) {
        eventDb.createEvent({
          project_id: projectId,
          title: event.title,
          description: event.description,
          type: event.type,
          agent: event.agent || this.name,
          message: event.message || null
        });
      } else if (typeof window !== 'undefined') {
        // Client-side: use API to create event
        await fetch('/api/kiro/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            title: event.title,
            description: event.description,
            type: event.type,
            agent: event.agent || this.name,
            message: event.message || null
          })
        }).catch(error => {
          console.warn('Failed to log event via API:', error);
          // Don't throw - logging failures shouldn't break the main flow
        });
      }
    } catch (error) {
      console.error('Failed to log event:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Handle common error scenarios
   */
  protected handleError(error: any, taskType?: string): LLMResponse {
    let errorMessage = 'Unknown error occurred';
    let errorCode: number | undefined;

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        errorMessage = 'Request timed out';
        errorCode = 408;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Unable to connect to ${this.name} service`;
        errorCode = 503;
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Invalid API key or unauthorized access';
        errorCode = 401;
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded';
        errorCode = 429;
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        errorMessage = 'Invalid request parameters';
        errorCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
      errorCode,
      provider: this.name
    };
  }

  /**
   * Validate request parameters
   */
  protected validateRequest(request: LLMRequest): { valid: boolean; error?: string } {
    if (!request.prompt || request.prompt.trim().length === 0) {
      return { valid: false, error: 'Prompt is required and cannot be empty' };
    }

    if (request.maxTokens && (request.maxTokens < 1 || request.maxTokens > 100000)) {
      return { valid: false, error: 'maxTokens must be between 1 and 100000' };
    }

    if (request.temperature && (request.temperature < 0 || request.temperature > 2)) {
      return { valid: false, error: 'temperature must be between 0 and 2' };
    }

    return { valid: true };
  }

  /**
   * Create standardized headers for HTTP requests
   */
  protected createHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vibeman-LLM-Client/1.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return { ...headers, ...additionalHeaders };
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  protected async makeRequest(
    url: string, 
    options: RequestInit, 
    timeoutMs: number = 300000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
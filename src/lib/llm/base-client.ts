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
      if (error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('timed out')) {
        errorMessage = 'Request timed out - the API took too long to respond';
        errorCode = 408;
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
        errorMessage = `Unable to connect to ${this.name} service - connection refused`;
        errorCode = 503;
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('Network error')) {
        errorMessage = `Network error: Unable to reach ${this.name} API. Check your internet connection`;
        errorCode = 503;
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('Connection timed out')) {
        errorMessage = 'Connection timed out - check your network and firewall settings';
        errorCode = 504;
      } else if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Authentication failed')) {
        errorMessage = 'Invalid API key or unauthorized access - check your .env file';
        errorCode = 401;
      } else if (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded - please wait before making more requests';
        errorCode = 429;
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        errorMessage = 'Invalid request parameters';
        errorCode = 400;
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorMessage = 'API server error - this is a temporary issue with the service';
        errorCode = 500;
      } else if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
        errorMessage = 'Bad Gateway - the API server is temporarily unavailable';
        errorCode = 502;
      } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        errorMessage = 'Service unavailable - the API is temporarily down';
        errorCode = 503;
      } else {
        errorMessage = error.message;
      }

      console.error(`[${this.name}] Error in ${taskType || 'unknown task'}:`, errorMessage);
    } else {
      console.error(`[${this.name}] Non-Error object thrown:`, error);
      errorMessage = String(error);
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
    if (!request.prompt || typeof request.prompt !== 'string') {
      return { valid: false, error: 'Prompt is required and must be a string' };
    }

    if (request.prompt.trim().length === 0) {
      return { valid: false, error: 'Prompt cannot be empty' };
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

      // Enhance error messages for common network issues
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeoutMs / 1000} seconds. The API took too long to respond.`);
        } else if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
          throw new Error(`Network error: Unable to reach ${url}. Check your internet connection and verify the API endpoint is accessible.`);
        } else if (error.message.includes('ECONNREFUSED')) {
          throw new Error(`Connection refused: The API server at ${url} is not accepting connections. It may be down or blocked by a firewall.`);
        } else if (error.message.includes('ETIMEDOUT')) {
          throw new Error(`Connection timed out while trying to reach ${url}. Check your network connection and firewall settings.`);
        } else if (error.message.includes('ECONNRESET')) {
          throw new Error(`Connection was reset by the API server. This is usually a temporary network issue.`);
        } else if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
          throw new Error(`SSL/TLS certificate error: ${error.message}. This could be a security or proxy configuration issue.`);
        }
      }

      // Re-throw the original error if we didn't enhance it
      throw error;
    }
  }
}
// Base client class with common functionality for all LLM providers

import { LLMRequest, LLMResponse, LLMProgress, LLMProvider } from './types';
import { generateLlmRequestId } from '@/lib/idGenerator';

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
    return generateLlmRequestId(this.name);
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
   * HTTP status codes worth retrying — transient throughput/server failures.
   * 408 Request Timeout, 429 Too Many Requests, 500/502/503/504 server-side.
   * Other 4xx are deterministic (bad key, bad request) and must NOT be retried.
   */
  private static readonly RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

  /** Cap on how long we'll honor a Retry-After header before giving up. */
  private static readonly MAX_RETRY_AFTER_MS = 60_000;

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Decide whether a thrown fetch error is worth retrying.
   * Our own request timeout (AbortError) is excluded: retrying burns another
   * full timeout window, which is expensive for long-running LLM requests.
   */
  private isRetryableNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (error.name === 'AbortError') return false;
    const msg = error.message;
    return (
      msg.includes('ECONNRESET') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('EAI_AGAIN') ||
      msg.includes('socket hang up') ||
      msg.includes('fetch failed')
    );
  }

  /**
   * Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds.
   * Returns null when absent or unparseable; result is capped at MAX_RETRY_AFTER_MS.
   */
  private parseRetryAfter(response: Response): number | null {
    const header = response.headers.get('retry-after');
    if (!header) return null;

    const seconds = Number(header);
    let ms: number;
    if (Number.isFinite(seconds)) {
      ms = seconds * 1000;
    } else {
      const date = Date.parse(header);
      if (!Number.isFinite(date)) return null;
      ms = date - Date.now();
    }

    if (ms <= 0) return null;
    return Math.min(ms, BaseLLMClient.MAX_RETRY_AFTER_MS);
  }

  /**
   * Enhance low-level network errors into actionable messages.
   */
  private enhanceNetworkError(error: unknown, url: string, timeoutMs: number): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error(`Request timed out after ${timeoutMs / 1000} seconds. The API took too long to respond.`);
      } else if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        return new Error(`Network error: Unable to reach ${url}. Check your internet connection and verify the API endpoint is accessible.`);
      } else if (error.message.includes('ECONNREFUSED')) {
        return new Error(`Connection refused: The API server at ${url} is not accepting connections. It may be down or blocked by a firewall.`);
      } else if (error.message.includes('ETIMEDOUT')) {
        return new Error(`Connection timed out while trying to reach ${url}. Check your network connection and firewall settings.`);
      } else if (error.message.includes('ECONNRESET')) {
        return new Error(`Connection was reset by the API server. This is usually a temporary network issue.`);
      } else if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
        return new Error(`SSL/TLS certificate error: ${error.message}. This could be a security or proxy configuration issue.`);
      }
    }
    // Re-use the original error if we didn't enhance it
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Make an HTTP request with timeout, automatic retry on transient failures,
   * and enhanced error handling.
   *
   * Retries (exponential backoff, honoring a Retry-After header when present)
   * are applied to transient HTTP statuses (429/5xx) and transient network
   * errors. Deterministic failures (4xx other than 408/429) and our own request
   * timeout are NOT retried. Pass `retries: 0` for health/probe calls that
   * should fail fast.
   *
   * @param timeoutMs Per-attempt timeout in milliseconds (default 5 minutes)
   * @param retries   Number of retry attempts after the first (default 2 → 3 total)
   */
  protected async makeRequest(
    url: string,
    options: RequestInit,
    timeoutMs: number = 300000,
    retries: number = 2
  ): Promise<Response> {
    const baseDelayMs = 1000;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Retry transient server/throughput failures before handing the
        // response back to the caller. On the final attempt we fall through
        // and return the failing response so the caller's existing
        // !response.ok handling produces the error as before.
        if (attempt < retries && BaseLLMClient.RETRYABLE_STATUS.has(response.status)) {
          const retryAfter = this.parseRetryAfter(response);
          const delay = retryAfter ?? baseDelayMs * Math.pow(2, attempt);
          // Free the socket — we're discarding this response body.
          try { await response.body?.cancel(); } catch { /* ignore */ }
          console.warn(`[${this.name}] Transient HTTP ${response.status} from ${url}; retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await this.sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        if (attempt < retries && this.isRetryableNetworkError(error)) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.warn(`[${this.name}] Transient network error from ${url}; retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await this.sleep(delay);
          continue;
        }

        throw this.enhanceNetworkError(error, url, timeoutMs);
      }
    }

    // Unreachable in practice: the loop always returns or throws on its final
    // iteration. Kept for type-safety / defensive completeness.
    throw this.enhanceNetworkError(lastError, url, timeoutMs);
  }
}
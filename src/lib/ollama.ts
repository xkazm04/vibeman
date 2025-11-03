// Import eventDb only on server side to avoid client-side issues
interface EventDb {
  createEvent: (event: {
    project_id: string;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'error' | 'success';
    agent: string | null;
    message: string | null;
  }) => void;
}

let eventDb: EventDb | null = null;
if (typeof window === 'undefined') {
  // Server-side only
  eventDb = require('./eventDatabase').eventDb as EventDb;
}

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

export interface OllamaRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  projectId?: string;
  taskType?: string;
  taskDescription?: string;
}

export interface OllamaResponse {
  success: boolean;
  response?: string;
  model?: string;
  created_at?: string;
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  error?: string;
  errorCode?: number;
}

export interface OllamaProgress {
  onStart?: (taskId: string) => void;
  onProgress?: (progress: number, message?: string) => void;
  onComplete?: (response: OllamaResponse) => void;
  onError?: (error: string) => void;
}

/**
 * Universal Ollama API helper with progress tracking and event logging
 */
export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL, defaultModel: string = DEFAULT_MODEL) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  /**
   * Make a request to Ollama API with comprehensive error handling and event logging
   */
  async generate(
    request: OllamaRequest,
    progress?: OllamaProgress
  ): Promise<OllamaResponse> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();

    try {
      // Log start event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'info',
          title: 'AI Generation Started',
          description: request.taskDescription || 'AI generation task initiated',
          agent: 'ollama',
          message: `Task: ${request.taskType || 'unknown'} | Model: ${request.model || this.defaultModel}`
        });
      }

      progress?.onStart?.(taskId);
      progress?.onProgress?.(10, 'Connecting to Ollama...');

      // Validate Ollama connection first
      const isAvailable = await this.checkOllamaAvailability();
      if (!isAvailable) {
        throw new Error('Unable to connect to Ollama. Please ensure Ollama is running on localhost:11434');
      }

      progress?.onProgress?.(20, 'Sending request to AI model...');

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model || this.defaultModel,
          prompt: request.prompt,
          stream: request.stream || false
        }),
        // Add timeout for long-running requests
        signal: AbortSignal.timeout(300000) // 5 minutes
      });

      progress?.onProgress?.(60, 'Processing AI response...');

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const errorMessage = `Ollama API error (${response.status}): ${errorText}`;

        // Log error event
        if (request.projectId) {
          await this.logEvent(request.projectId, {
            type: 'error',
            title: 'AI Generation Failed',
            description: errorMessage,
            agent: 'ollama',
            message: `Task: ${request.taskType || 'unknown'} | Duration: ${Date.now() - startTime}ms`
          });
        }

        progress?.onError?.(errorMessage);

        return {
          success: false,
          error: errorMessage,
          errorCode: response.status
        };
      }

      progress?.onProgress?.(80, 'Parsing response...');

      const result = await response.json();

      progress?.onProgress?.(100, 'Complete');

      const duration = Date.now() - startTime;
      const ollamaResponse: OllamaResponse = {
        success: true,
        response: result.response,
        model: result.model,
        created_at: result.created_at,
        done: result.done,
        total_duration: result.total_duration,
        load_duration: result.load_duration,
        prompt_eval_count: result.prompt_eval_count,
        prompt_eval_duration: result.prompt_eval_duration,
        eval_count: result.eval_count,
        eval_duration: result.eval_duration
      };

      // Log success event with metrics
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'success',
          title: 'AI Generation Completed',
          description: `Successfully generated ${result.response?.length || 0} characters`,
          agent: 'ollama',
          message: JSON.stringify({
            taskType: request.taskType || 'unknown',
            duration: duration,
            model: result.model,
            promptTokens: result.prompt_eval_count,
            responseTokens: result.eval_count,
            totalDuration: result.total_duration,
            responseLength: result.response?.length || 0
          })
        });
      }

      progress?.onComplete?.(ollamaResponse);
      return ollamaResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorMessage = 'AI generation timed out after 5 minutes';
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Unable to connect to Ollama. Please ensure Ollama is running on localhost:11434';
        } else {
          errorMessage = error.message;
        }
      }

      // Log error event
      if (request.projectId) {
        await this.logEvent(request.projectId, {
          type: 'error',
          title: 'AI Generation Error',
          description: errorMessage,
          agent: 'ollama',
          message: `Task: ${request.taskType || 'unknown'} | Duration: ${duration}ms | Error: ${errorMessage}`
        });
      }

      progress?.onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if Ollama is available and responsive
   */
  async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      return response.ok;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Ollama availability check failed:', error);
      }
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to get available models:', error);
      }
      return [];
    }
  }

  /**
   * Parse JSON response from Ollama with fallback handling
   */
  parseJsonResponse<T = unknown>(response: string): { success: boolean; data?: T; error?: string } {
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
   * Log events to the database (server-side only)
   */
  private async logEvent(projectId: string, event: {
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
          agent: event.agent || null,
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
            agent: event.agent || null,
            message: event.message || null
          })
        }).catch(() => {
          // Don't throw - logging failures shouldn't break the main flow
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to log event:', error);
      }
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Generate a unique task ID for tracking
   */
  private generateTaskId(): string {
    return `ollama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export a default instance
export const ollamaClient = new OllamaClient();

// Convenience functions for common use cases
export async function generateWithOllama(
  prompt: string,
  options?: {
    model?: string;
    projectId?: string;
    taskType?: string;
    taskDescription?: string;
    onProgress?: (progress: number, message?: string) => void;
  }
): Promise<OllamaResponse> {
  return ollamaClient.generate({
    prompt,
    model: options?.model,
    projectId: options?.projectId,
    taskType: options?.taskType,
    taskDescription: options?.taskDescription
  }, {
    onProgress: options?.onProgress
  });
}

export async function parseOllamaJson<T = unknown>(response: string): Promise<{ success: boolean; data?: T; error?: string }> {
  return ollamaClient.parseJsonResponse<T>(response);
}
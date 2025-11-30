/**
 * Modular Scan Adapter Framework - Base Adapter
 *
 * Abstract base class that provides common functionality for scan adapters.
 * Reduces boilerplate and enforces consistent patterns.
 *
 * Includes centralized error handling with:
 * - Automatic retry logic with exponential backoff
 * - Graceful degradation and fallback behaviors
 * - Consistent, actionable error messages
 */

import { Project } from '@/types';
import { ScanAdapter, ScanCategory, ScanContext, ScanResult, DecisionData } from './types';
import {
  AdapterErrorHandler,
  fetchWithErrorHandling,
  toAdapterError,
  AdapterError,
  type ErrorHandlerConfig,
  type RetryConfig,
} from './errors';

export abstract class BaseAdapter<TData = any> implements ScanAdapter<TData> {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly supportedTypes: string[];
  public abstract readonly category: ScanCategory;
  public readonly priority: number = 50; // Default priority

  /** Error handler instance for this adapter */
  private _errorHandler: AdapterErrorHandler | null = null;

  /** Retry configuration for this adapter (can be overridden in subclasses) */
  protected readonly retryConfig: Partial<RetryConfig> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  };

  /** Default timeout for API requests in ms */
  protected readonly defaultTimeoutMs: number = 60000;

  /**
   * Get the error handler instance for this adapter
   */
  protected get errorHandler(): AdapterErrorHandler {
    if (!this._errorHandler) {
      this._errorHandler = new AdapterErrorHandler(this.id);
    }
    return this._errorHandler;
  }

  /**
   * Default implementation: check if project type is in supportedTypes
   * Override for custom logic
   */
  public canHandle(project: Project): boolean {
    // Support wildcard
    if (this.supportedTypes.includes('*')) {
      return true;
    }

    // Check project type
    const projectType = project.type || 'other';
    return this.supportedTypes.includes(projectType);
  }

  /**
   * Execute the scan - must be implemented by subclasses
   */
  public abstract execute(context: ScanContext): Promise<ScanResult<TData>>;

  /**
   * Build decision data from scan results - must be implemented by subclasses
   */
  public abstract buildDecision(result: ScanResult<TData>, project: Project): DecisionData | null;

  /**
   * Optional validation - can be overridden
   */
  public async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  /**
   * Helper: Make API request with centralized error handling and retry logic
   *
   * Features:
   * - Automatic retries with exponential backoff for transient failures
   * - Proper error categorization (network, timeout, rate limit, etc.)
   * - Consistent error messages with recovery suggestions
   */
  protected async fetchApi<T = any>(
    url: string,
    options?: RequestInit,
    config?: {
      serviceName?: string;
      timeoutMs?: number;
      retry?: Partial<RetryConfig>;
    }
  ): Promise<{ success: boolean; data?: T; error?: string; adapterError?: AdapterError }> {
    const result = await fetchWithErrorHandling<T>(
      url,
      options,
      this.id,
      config?.serviceName
    );

    if (result.success) {
      return { success: true, data: result.data };
    }

    // result is { success: false; error: AdapterError }
    const errorResult = result as { success: false; error: AdapterError };
    return {
      success: false,
      error: errorResult.error.userMessage,
      adapterError: errorResult.error,
    };
  }

  /**
   * Helper: Execute an operation with centralized error handling
   *
   * Wraps any async operation with:
   * - Automatic retry logic for transient failures
   * - Timeout handling
   * - Consistent error categorization
   * - Optional fallback behavior
   */
  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    config?: Partial<ErrorHandlerConfig<T>>
  ): Promise<T> {
    return this.errorHandler.handle(operation, {
      retry: this.retryConfig,
      timeoutMs: this.defaultTimeoutMs,
      ...config,
    });
  }

  /**
   * Helper: Execute an operation and return a ScanResult
   *
   * On error, creates a standardized error result instead of throwing.
   * Useful for execute() method implementations.
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<ScanResult<T>>,
    config?: Partial<ErrorHandlerConfig<ScanResult<T>>>
  ): Promise<ScanResult<T>> {
    try {
      return await this.errorHandler.handle(operation, {
        retry: this.retryConfig,
        timeoutMs: this.defaultTimeoutMs,
        ...config,
      });
    } catch (error) {
      return this.createErrorResult<T>(error);
    }
  }

  /**
   * Helper: Create an error result from any error
   */
  protected createErrorResult<T>(error: unknown): ScanResult<T> {
    return this.errorHandler.createErrorResult<T>(error);
  }

  /**
   * Helper: Convert any error to an AdapterError
   */
  protected toAdapterError(error: unknown): AdapterError {
    return toAdapterError(error, this.id);
  }

  /**
   * Helper: Log debug message
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.id}] ${message}`, ...args);
  }

  /**
   * Helper: Log error
   */
  protected error(message: string, error?: any): void {
    console.error(`[${this.id}] ${message}`, error);
  }

  /**
   * Helper: Create a standard decision data object
   */
  protected createDecision(
    params: Omit<DecisionData, 'projectId' | 'projectPath' | 'projectType'>,
    project: Project
  ): DecisionData {
    return {
      ...params,
      projectId: project.id,
      projectPath: project.path,
      projectType: project.type || 'other',
    };
  }

  /**
   * Helper: Create a standard scan result
   */
  protected createResult<T = TData>(
    success: boolean,
    data?: T,
    error?: string,
    warnings?: string[]
  ): ScanResult<T> {
    return {
      success,
      data,
      error,
      warnings,
      metadata: {},
    };
  }

  /**
   * Helper: Wrap execution with timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }
}

/**
 * Base Scan Component
 * Abstract base class for all scan components in the Blueprint system
 */

import { ValidationResult } from '../../../types';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
  ScanExecutionMode,
  ScanCategory,
  ScanComponentDefinition,
} from './types';

/**
 * Abstract base class for scan components
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseScan<
  TConfig extends ScanConfig = ScanConfig,
  TData = unknown
> {
  // Component identification
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;

  // Execution characteristics
  abstract readonly executionMode: ScanExecutionMode;
  abstract readonly category: ScanCategory;
  abstract readonly requiresContext: boolean;

  // Optional metadata
  readonly supportedProjectTypes: string[] = ['*'];
  readonly icon?: string;
  readonly color?: string;
  readonly tags?: string[];

  protected config: TConfig;
  protected cancelled = false;
  protected cancelCallbacks: Array<() => void> = [];

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * Execute the scan
   * Must be implemented by subclasses
   */
  abstract execute(): Promise<ScanResult<TData>>;

  /**
   * Build decision data for UI presentation
   * Must be implemented by subclasses
   */
  abstract buildDecision(result: ScanResult<TData>): DecisionData<TData> | null;

  /**
   * Validate the scan configuration
   * Override in subclasses for custom validation
   */
  validateConfig(): ValidationResult {
    const errors: string[] = [];

    if (!this.config.projectId) {
      errors.push('projectId is required');
    }

    if (!this.config.projectPath) {
      errors.push('projectPath is required');
    }

    if (this.requiresContext && !this.config.contextId) {
      errors.push('contextId is required for this scan');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  /**
   * Check if this scan can handle the given project type
   */
  canHandle(projectType: string): boolean {
    return (
      this.supportedProjectTypes.includes('*') ||
      this.supportedProjectTypes.includes(projectType)
    );
  }

  /**
   * Get the component definition for registry
   */
  getDefinition(): ScanComponentDefinition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      executionMode: this.executionMode,
      requiresContext: this.requiresContext,
      supportedProjectTypes: this.supportedProjectTypes,
      icon: this.icon,
      color: this.color,
      tags: this.tags,
    };
  }

  /**
   * Report progress to callbacks
   */
  protected reportProgress(progress: number, message?: string): void {
    if (!this.cancelled) {
      this.config.onProgress?.(progress, message);
    }
  }

  /**
   * Log a message
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    this.config.onLog?.(level, message);
  }

  /**
   * Check if the scan has been cancelled
   */
  protected isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Cancel the scan
   */
  cancel(): void {
    this.cancelled = true;
    this.cancelCallbacks.forEach(cb => cb());
  }

  /**
   * Register a cancel callback
   */
  onCancel(callback: () => void): void {
    this.cancelCallbacks.push(callback);
  }

  /**
   * Create a standardized error result
   */
  protected errorResult(error: string): ScanResult<TData> {
    return {
      success: false,
      error,
    };
  }

  /**
   * Create a standardized success result
   */
  protected successResult(
    data: TData,
    extras?: Partial<ScanResult<TData>>
  ): ScanResult<TData> {
    return {
      success: true,
      data,
      ...extras,
    };
  }

  /**
   * Fetch JSON from an API endpoint
   */
  protected async fetchJson<T>(
    url: string,
    options?: RequestInit
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Post JSON to an API endpoint
   */
  protected async postJson<T>(
    url: string,
    body: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.fetchJson<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

/**
 * Type guard to check if a scan requires context
 */
export function isContextScan(scan: BaseScan): boolean {
  return scan.requiresContext;
}

/**
 * Type guard to check if a scan uses polling execution
 */
export function isPollingScan(scan: BaseScan): boolean {
  return scan.executionMode === 'polling';
}

/**
 * Type guard to check if a scan is fire-and-forget
 */
export function isFireAndForgetScan(scan: BaseScan): boolean {
  return scan.executionMode === 'fire-and-forget';
}

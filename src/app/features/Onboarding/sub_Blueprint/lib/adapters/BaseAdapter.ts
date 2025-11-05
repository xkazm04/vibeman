/**
 * Modular Scan Adapter Framework - Base Adapter
 *
 * Abstract base class that provides common functionality for scan adapters.
 * Reduces boilerplate and enforces consistent patterns.
 */

import { Project } from '@/types';
import { ScanAdapter, ScanCategory, ScanContext, ScanResult, DecisionData } from './types';

export abstract class BaseAdapter<TData = any> implements ScanAdapter<TData> {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly supportedTypes: string[];
  public abstract readonly category: ScanCategory;
  public readonly priority: number = 50; // Default priority

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
   * Helper: Make API request with error handling
   */
  protected async fetchApi<T = any>(
    url: string,
    options?: RequestInit
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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

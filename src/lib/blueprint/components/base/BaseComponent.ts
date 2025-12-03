/**
 * Base Component Interface and Abstract Class
 * Foundation for all blueprint components
 */

import { ComponentType, ExecutionContext, ValidationResult } from '../../types';

export interface IBlueprintComponent<TInput = unknown, TOutput = unknown, TConfig = unknown> {
  readonly id: string;
  readonly type: ComponentType;
  readonly name: string;
  readonly version: string;
  readonly description: string;

  initialize(config: TConfig): Promise<void>;
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
  cleanup(): Promise<void>;

  validateConfig(config: TConfig): ValidationResult;
  validateInput(input: TInput): ValidationResult;

  getConfigSchema(): Record<string, unknown>;
  getDefaultConfig(): TConfig;
  getInputTypes(): string[];
  getOutputTypes(): string[];
}

export abstract class BaseComponent<TInput, TOutput, TConfig> implements IBlueprintComponent<TInput, TOutput, TConfig> {
  abstract readonly id: string;
  abstract readonly type: ComponentType;
  abstract readonly name: string;
  abstract readonly description: string;
  readonly version = '1.0.0';

  protected config!: TConfig;
  protected context!: ExecutionContext;

  async initialize(config: TConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config for ${this.id}: ${validation.errors?.join(', ')}`);
    }
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  abstract execute(input: TInput, context: ExecutionContext): Promise<TOutput>;

  async cleanup(): Promise<void> {
    // Override if cleanup needed
  }

  abstract validateConfig(config: TConfig): ValidationResult;

  validateInput(_input: TInput): ValidationResult {
    return { valid: true };
  }

  abstract getConfigSchema(): Record<string, unknown>;
  abstract getDefaultConfig(): TConfig;
  abstract getInputTypes(): string[];
  abstract getOutputTypes(): string[];

  // Helper methods
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    this.context?.log(level, `[${this.id}] ${message}`, data);
  }

  protected reportProgress(progress: number, message?: string): void {
    this.context?.reportProgress(progress, message);
  }

  protected isCancelled(): boolean {
    return this.context?.isCancelled() ?? false;
  }
}

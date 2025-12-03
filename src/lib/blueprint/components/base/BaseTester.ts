/**
 * Base Tester Component
 * Foundation for all tester components that validate results
 */

import { BaseComponent } from './BaseComponent';
import { ValidationResult } from '../../types';

export interface TesterConfig {
  failOnError?: boolean;
  continueOnFailure?: boolean;
}

export interface TestResult {
  passed: boolean;
  message: string;
  details?: unknown;
}

export abstract class BaseTester<TInput, TConfig extends TesterConfig>
  extends BaseComponent<TInput, TestResult[], TConfig> {

  readonly type = 'tester' as const;

  abstract getInputTypes(): string[];

  getOutputTypes(): string[] {
    return ['TestResult[]'];
  }
}

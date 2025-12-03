/**
 * Base Executor Component
 * Foundation for all executor components that perform actions
 */

import { BaseComponent } from './BaseComponent';
import { ValidationResult } from '../../types';

export interface ExecutorConfig {
  dryRun?: boolean;
}

export abstract class BaseExecutor<TInput, TOutput, TConfig extends ExecutorConfig>
  extends BaseComponent<TInput, TOutput, TConfig> {

  readonly type = 'executor' as const;

  abstract getInputTypes(): string[];
  abstract getOutputTypes(): string[];
}

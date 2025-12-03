/**
 * Base Processor Component
 * Foundation for all processor components that transform data
 */

import { BaseComponent } from './BaseComponent';
import { ValidationResult } from '../../types';

export interface ProcessorConfig {
  // Base processor config
}

export abstract class BaseProcessor<TInput, TOutput, TConfig extends ProcessorConfig>
  extends BaseComponent<TInput, TOutput, TConfig> {

  readonly type = 'processor' as const;

  abstract getInputTypes(): string[];
  abstract getOutputTypes(): string[];
}

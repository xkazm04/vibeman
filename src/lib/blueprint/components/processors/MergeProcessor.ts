/**
 * Merge Processor
 * Combines multiple issue arrays into one
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

interface MergeConfig extends ProcessorConfig {
  deduplicateByFile?: boolean;
  deduplicateByLine?: boolean;
}

export class MergeProcessor extends BaseProcessor<Issue[][], Issue[], MergeConfig> {
  readonly id = 'processor.merge';
  readonly name = 'Issue Merger';
  readonly description = 'Combines multiple issue arrays into one';

  async execute(input: Issue[][], context: ExecutionContext): Promise<Issue[]> {
    this.context = context;

    // Flatten all arrays
    let merged = input.flat();

    // Deduplicate if configured
    if (this.config.deduplicateByFile || this.config.deduplicateByLine) {
      merged = this.deduplicate(merged);
    }

    this.log('info', `Merged ${input.length} arrays into ${merged.length} issues`);
    return merged;
  }

  private deduplicate(issues: Issue[]): Issue[] {
    const seen = new Set<string>();
    const result: Issue[] = [];

    for (const issue of issues) {
      let key: string;

      if (this.config.deduplicateByLine) {
        // Deduplicate by file + line
        key = `${issue.file}:${issue.line}:${issue.category}`;
      } else if (this.config.deduplicateByFile) {
        // Deduplicate by file + category (one issue per file per category)
        key = `${issue.file}:${issue.category}`;
      } else {
        // Use issue ID
        key = issue.id;
      }

      if (!seen.has(key)) {
        seen.add(key);
        result.push(issue);
      }
    }

    return result;
  }

  validateConfig(config: MergeConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        deduplicateByFile: {
          type: 'boolean',
          default: false,
          description: 'Remove duplicate issues for same file and category'
        },
        deduplicateByLine: {
          type: 'boolean',
          default: false,
          description: 'Remove duplicate issues for same file, line, and category'
        }
      }
    };
  }

  getDefaultConfig(): MergeConfig {
    return {
      deduplicateByFile: false,
      deduplicateByLine: false,
    };
  }

  getInputTypes(): string[] {
    return ['Issue[][]'];
  }

  getOutputTypes(): string[] {
    return ['Issue[]'];
  }
}

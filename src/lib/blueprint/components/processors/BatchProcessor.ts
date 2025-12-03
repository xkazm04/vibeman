/**
 * Batch Processor
 * Creates execution batches from issues
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

interface BatchConfig extends ProcessorConfig {
  batchSize: number;
  groupByFile?: boolean;
  groupByCategory?: boolean;
  maxBatches?: number;
}

export interface IssueBatch {
  id: string;
  index: number;
  issues: Issue[];
  fileCount: number;
  categoryCount: number;
  totalIssues: number;
}

export interface BatchResult {
  batches: IssueBatch[];
  totalIssues: number;
  batchCount: number;
}

export class BatchProcessor extends BaseProcessor<Issue[], BatchResult, BatchConfig> {
  readonly id = 'processor.batch';
  readonly name = 'Issue Batcher';
  readonly description = 'Creates execution batches from issues';

  async execute(input: Issue[], context: ExecutionContext): Promise<BatchResult> {
    this.context = context;

    let batches: IssueBatch[];

    if (this.config.groupByFile) {
      batches = this.createFileBasedBatches(input);
    } else if (this.config.groupByCategory) {
      batches = this.createCategoryBasedBatches(input);
    } else {
      batches = this.createSizeBasedBatches(input);
    }

    // Limit batches if configured
    if (this.config.maxBatches && batches.length > this.config.maxBatches) {
      batches = batches.slice(0, this.config.maxBatches);
    }

    this.log('info', `Created ${batches.length} batches from ${input.length} issues`);

    return {
      batches,
      totalIssues: input.length,
      batchCount: batches.length,
    };
  }

  private createSizeBasedBatches(issues: Issue[]): IssueBatch[] {
    const batches: IssueBatch[] = [];

    for (let i = 0; i < issues.length; i += this.config.batchSize) {
      const batchIssues = issues.slice(i, i + this.config.batchSize);
      batches.push(this.createBatch(batches.length, batchIssues));
    }

    return batches;
  }

  private createFileBasedBatches(issues: Issue[]): IssueBatch[] {
    const fileGroups = new Map<string, Issue[]>();

    for (const issue of issues) {
      if (!fileGroups.has(issue.file)) {
        fileGroups.set(issue.file, []);
      }
      fileGroups.get(issue.file)!.push(issue);
    }

    const batches: IssueBatch[] = [];
    let currentBatch: Issue[] = [];

    for (const [, fileIssues] of Array.from(fileGroups)) {
      // If adding this file would exceed batch size, start new batch
      if (currentBatch.length + fileIssues.length > this.config.batchSize && currentBatch.length > 0) {
        batches.push(this.createBatch(batches.length, currentBatch));
        currentBatch = [];
      }
      currentBatch.push(...fileIssues);
    }

    // Don't forget the last batch
    if (currentBatch.length > 0) {
      batches.push(this.createBatch(batches.length, currentBatch));
    }

    return batches;
  }

  private createCategoryBasedBatches(issues: Issue[]): IssueBatch[] {
    const categoryGroups = new Map<string, Issue[]>();

    for (const issue of issues) {
      if (!categoryGroups.has(issue.category)) {
        categoryGroups.set(issue.category, []);
      }
      categoryGroups.get(issue.category)!.push(issue);
    }

    const batches: IssueBatch[] = [];

    for (const [, categoryIssues] of Array.from(categoryGroups)) {
      // Create batches within each category
      for (let i = 0; i < categoryIssues.length; i += this.config.batchSize) {
        const batchIssues = categoryIssues.slice(i, i + this.config.batchSize);
        batches.push(this.createBatch(batches.length, batchIssues));
      }
    }

    return batches;
  }

  private createBatch(index: number, issues: Issue[]): IssueBatch {
    const files = new Set(issues.map(i => i.file));
    const categories = new Set(issues.map(i => i.category));

    return {
      id: `batch-${index + 1}-${Date.now()}`,
      index: index + 1,
      issues,
      fileCount: files.size,
      categoryCount: categories.size,
      totalIssues: issues.length,
    };
  }

  validateConfig(config: BatchConfig): ValidationResult {
    if (config.batchSize < 1) {
      return { valid: false, errors: ['batchSize must be at least 1'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        batchSize: {
          type: 'number',
          default: 10,
          minimum: 1,
          description: 'Maximum number of issues per batch'
        },
        groupByFile: {
          type: 'boolean',
          default: false,
          description: 'Keep issues from same file together in batches'
        },
        groupByCategory: {
          type: 'boolean',
          default: false,
          description: 'Keep issues from same category together in batches'
        },
        maxBatches: {
          type: 'number',
          description: 'Maximum number of batches to create'
        }
      },
      required: ['batchSize']
    };
  }

  getDefaultConfig(): BatchConfig {
    return {
      batchSize: 10,
      groupByFile: false,
      groupByCategory: false,
    };
  }

  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  getOutputTypes(): string[] {
    return ['BatchResult'];
  }
}

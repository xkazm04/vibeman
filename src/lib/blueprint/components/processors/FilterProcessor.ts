/**
 * Filter Processor
 * Filter issues by severity, category, or other criteria
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

interface FilterConfig extends ProcessorConfig {
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  categories?: string[];
  excludeCategories?: string[];
  autoFixableOnly?: boolean;
  maxIssues?: number;
}

export class FilterProcessor extends BaseProcessor<Issue[], Issue[], FilterConfig> {
  readonly id = 'processor.filter';
  readonly name = 'Issue Filter';
  readonly description = 'Filter issues by severity, category, or other criteria';

  async execute(input: Issue[], context: ExecutionContext): Promise<Issue[]> {
    this.context = context;
    let filtered = [...input];

    // Filter by severity
    if (this.config.minSeverity) {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(this.config.minSeverity);
      filtered = filtered.filter(issue =>
        severityOrder.indexOf(issue.severity) >= minIndex
      );
    }

    // Filter by categories
    if (this.config.categories?.length) {
      filtered = filtered.filter(issue =>
        this.config.categories!.includes(issue.category)
      );
    }

    // Exclude categories
    if (this.config.excludeCategories?.length) {
      filtered = filtered.filter(issue =>
        !this.config.excludeCategories!.includes(issue.category)
      );
    }

    // Auto-fixable only
    if (this.config.autoFixableOnly) {
      filtered = filtered.filter(issue => issue.autoFixAvailable);
    }

    // Limit results
    if (this.config.maxIssues && filtered.length > this.config.maxIssues) {
      filtered = filtered.slice(0, this.config.maxIssues);
    }

    this.log('info', `Filtered ${input.length} issues to ${filtered.length}`);
    return filtered;
  }

  validateConfig(config: FilterConfig): ValidationResult {
    if (config.minSeverity && !['low', 'medium', 'high', 'critical'].includes(config.minSeverity)) {
      return { valid: false, errors: ['Invalid severity level'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        minSeverity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Minimum severity to include'
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Categories to include (empty = all)'
        },
        excludeCategories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Categories to exclude'
        },
        autoFixableOnly: {
          type: 'boolean',
          default: false,
          description: 'Only include auto-fixable issues'
        },
        maxIssues: {
          type: 'number',
          description: 'Maximum number of issues to return'
        }
      }
    };
  }

  getDefaultConfig(): FilterConfig {
    return {};
  }

  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  getOutputTypes(): string[] {
    return ['Issue[]'];
  }
}

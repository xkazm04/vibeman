/**
 * Priority Processor
 * Sorts issues by impact/effort ratio or custom priority calculation
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

interface PriorityConfig extends ProcessorConfig {
  sortBy: 'severity' | 'autofix-first' | 'impact-effort';
  severityWeights?: Record<string, number>;
  autoFixBonus?: number;
}

export type PrioritizedIssue = Issue & {
  priority: number;
  rank: number;
};

export class PriorityProcessor extends BaseProcessor<Issue[], PrioritizedIssue[], PriorityConfig> {
  readonly id = 'processor.priority';
  readonly name = 'Issue Prioritizer';
  readonly description = 'Sorts issues by impact/effort ratio or custom priority';

  async execute(input: Issue[], context: ExecutionContext): Promise<PrioritizedIssue[]> {
    this.context = context;

    // Calculate priority for each issue
    const prioritized = input.map(issue => ({
      ...issue,
      priority: this.calculatePriority(issue),
      rank: 0,
    }));

    // Sort by priority (higher is better)
    prioritized.sort((a, b) => b.priority - a.priority);

    // Assign ranks
    prioritized.forEach((issue, index) => {
      issue.rank = index + 1;
    });

    this.log('info', `Prioritized ${input.length} issues`);
    return prioritized;
  }

  private calculatePriority(issue: Issue): number {
    const weights = this.config.severityWeights || {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };

    let priority = weights[issue.severity] || 50;

    // Bonus for auto-fixable issues
    if (issue.autoFixAvailable && this.config.autoFixBonus) {
      priority += this.config.autoFixBonus;
    }

    // Apply sorting strategy
    switch (this.config.sortBy) {
      case 'autofix-first':
        if (issue.autoFixAvailable) {
          priority += 1000; // Large bonus to ensure auto-fixable come first
        }
        break;

      case 'impact-effort':
        // Higher severity = more impact
        // Auto-fixable = less effort
        const impact = weights[issue.severity] || 50;
        const effort = issue.autoFixAvailable ? 10 : 50;
        priority = (impact / effort) * 100;
        break;

      case 'severity':
      default:
        // Already using severity weights
        break;
    }

    return priority;
  }

  validateConfig(config: PriorityConfig): ValidationResult {
    if (!['severity', 'autofix-first', 'impact-effort'].includes(config.sortBy)) {
      return { valid: false, errors: ['sortBy must be one of: severity, autofix-first, impact-effort'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        sortBy: {
          type: 'string',
          enum: ['severity', 'autofix-first', 'impact-effort'],
          default: 'severity',
          description: 'Priority calculation strategy'
        },
        severityWeights: {
          type: 'object',
          properties: {
            critical: { type: 'number' },
            high: { type: 'number' },
            medium: { type: 'number' },
            low: { type: 'number' },
          },
          description: 'Custom weights for severity levels'
        },
        autoFixBonus: {
          type: 'number',
          default: 10,
          description: 'Priority bonus for auto-fixable issues'
        }
      },
      required: ['sortBy']
    };
  }

  getDefaultConfig(): PriorityConfig {
    return {
      sortBy: 'severity',
      autoFixBonus: 10,
    };
  }

  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  getOutputTypes(): string[] {
    return ['PrioritizedIssue[]'];
  }
}

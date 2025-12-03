/**
 * Group Processor
 * Groups issues by file, category, or severity
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

interface GroupConfig extends ProcessorConfig {
  groupBy: 'file' | 'category' | 'severity';
  sortGroups?: 'asc' | 'desc' | 'count';
}

export interface GroupedIssues {
  groups: Array<{
    key: string;
    issues: Issue[];
    count: number;
  }>;
  totalIssues: number;
  groupCount: number;
}

export class GroupProcessor extends BaseProcessor<Issue[], GroupedIssues, GroupConfig> {
  readonly id = 'processor.group';
  readonly name = 'Issue Grouper';
  readonly description = 'Groups issues by file, category, or severity';

  async execute(input: Issue[], context: ExecutionContext): Promise<GroupedIssues> {
    this.context = context;

    const groupMap = new Map<string, Issue[]>();

    for (const issue of input) {
      const key = this.getGroupKey(issue);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(issue);
    }

    let groups = Array.from(groupMap.entries()).map(([key, issues]) => ({
      key,
      issues,
      count: issues.length,
    }));

    // Sort groups
    if (this.config.sortGroups) {
      groups = this.sortGroups(groups);
    }

    this.log('info', `Grouped ${input.length} issues into ${groups.length} groups`);

    return {
      groups,
      totalIssues: input.length,
      groupCount: groups.length,
    };
  }

  private getGroupKey(issue: Issue): string {
    switch (this.config.groupBy) {
      case 'file':
        return issue.file;
      case 'category':
        return issue.category;
      case 'severity':
        return issue.severity;
      default:
        return issue.category;
    }
  }

  private sortGroups(groups: GroupedIssues['groups']): GroupedIssues['groups'] {
    switch (this.config.sortGroups) {
      case 'asc':
        return groups.sort((a, b) => a.key.localeCompare(b.key));
      case 'desc':
        return groups.sort((a, b) => b.key.localeCompare(a.key));
      case 'count':
        return groups.sort((a, b) => b.count - a.count);
      default:
        return groups;
    }
  }

  validateConfig(config: GroupConfig): ValidationResult {
    if (!['file', 'category', 'severity'].includes(config.groupBy)) {
      return { valid: false, errors: ['groupBy must be one of: file, category, severity'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          enum: ['file', 'category', 'severity'],
          default: 'category',
          description: 'Field to group issues by'
        },
        sortGroups: {
          type: 'string',
          enum: ['asc', 'desc', 'count'],
          description: 'How to sort the groups'
        }
      },
      required: ['groupBy']
    };
  }

  getDefaultConfig(): GroupConfig {
    return {
      groupBy: 'category',
    };
  }

  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  getOutputTypes(): string[] {
    return ['GroupedIssues'];
  }
}

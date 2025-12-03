/**
 * Large Files Analyzer
 * Detects files that exceed a configurable line count threshold
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { LargeFileIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface LargeFilesAnalyzerConfig extends AnalyzerConfig {
  threshold: number;
  countBlankLines: boolean;
  countComments: boolean;
}

export class LargeFilesAnalyzer extends BaseAnalyzer<LargeFilesAnalyzerConfig, LargeFileIssue[]> {
  readonly id = 'analyzer.large-files';
  readonly name = 'Large Files';
  readonly description = 'Detect files that exceed a configurable line count threshold';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native', 'fastapi'],
    category: 'technical',
    tags: ['maintainability', 'code-structure'],
  };

  async execute(_: void, context: ExecutionContext): Promise<LargeFileIssue[]> {
    this.context = context;
    const issues: LargeFileIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Checking ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const lineCount = this.countLines(content);

        if (lineCount > this.config.threshold) {
          const relativePath = this.getRelativePath(file, context.projectPath);

          issues.push({
            id: this.generateIssueId(relativePath, 1, 'large-file'),
            file: relativePath,
            line: 1,
            severity: this.getSeverity(lineCount),
            category: 'large-file',
            title: `Large file: ${lineCount} lines`,
            description: `File has ${lineCount} lines, exceeding the threshold of ${this.config.threshold} lines. Consider splitting into smaller modules.`,
            lineCount,
            threshold: this.config.threshold,
            autoFixAvailable: false,
            suggestedFix: 'Split file into smaller, focused modules with single responsibilities'
          });
        }
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} large files`);
    return issues;
  }

  private countLines(content: string): number {
    const lines = content.split('\n');

    if (this.config.countBlankLines && this.config.countComments) {
      return lines.length;
    }

    let count = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Track block comments
      if (trimmed.startsWith('/*')) inBlockComment = true;
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
        if (!this.config.countComments) continue;
      }

      // Skip blank lines if configured
      if (!this.config.countBlankLines && trimmed === '') continue;

      // Skip comments if configured
      if (!this.config.countComments) {
        if (inBlockComment) continue;
        if (trimmed.startsWith('//')) continue;
        if (trimmed.startsWith('*')) continue;
      }

      count++;
    }

    return count;
  }

  private getSeverity(lineCount: number): LargeFileIssue['severity'] {
    const ratio = lineCount / this.config.threshold;
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  validateConfig(config: LargeFilesAnalyzerConfig): ValidationResult {
    if (config.threshold !== undefined && config.threshold < 50) {
      return { valid: false, errors: ['threshold must be at least 50 lines'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          default: 300,
          minimum: 50,
          description: 'Maximum number of lines before flagging a file'
        },
        countBlankLines: {
          type: 'boolean',
          default: true,
          description: 'Include blank lines in count'
        },
        countComments: {
          type: 'boolean',
          default: true,
          description: 'Include comment lines in count'
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          default: [],
          description: 'Additional patterns to exclude'
        }
      }
    };
  }

  getDefaultConfig(): LargeFilesAnalyzerConfig {
    return {
      threshold: 300,
      countBlankLines: true,
      countComments: true,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['LargeFileIssue[]'];
  }
}

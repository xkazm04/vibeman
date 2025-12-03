/**
 * Console Statements Analyzer
 * Detects console.log, console.warn, console.error and other console statements
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { ConsoleIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface ConsoleAnalyzerConfig extends AnalyzerConfig {
  includeDebug: boolean;
  includeInfo: boolean;
  minCount: number;
}

export class ConsoleAnalyzer extends BaseAnalyzer<ConsoleAnalyzerConfig, ConsoleIssue[]> {
  readonly id = 'analyzer.console';
  readonly name = 'Console Statements';
  readonly description = 'Detect console.log, console.warn, console.error and other console statements';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    tags: ['code-quality', 'debugging'],
  };

  async execute(_: void, context: ExecutionContext): Promise<ConsoleIssue[]> {
    this.context = context;
    const issues: ConsoleIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectConsoleStatements(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} console statements`);
    return issues;
  }

  private detectConsoleStatements(content: string, filePath: string, projectPath: string): ConsoleIssue[] {
    const issues: ConsoleIssue[] = [];
    const lines = content.split('\n');

    // Regex patterns for different console methods
    const consolePattern = /console\.(log|warn|error|debug|info|trace|table|dir|assert|count|group|groupEnd|time|timeEnd)\s*\(/g;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match;

      while ((match = consolePattern.exec(line)) !== null) {
        const consoleType = match[1] as ConsoleIssue['consoleType'];

        // Apply config filters
        if (consoleType === 'debug' && !this.config.includeDebug) continue;
        if (consoleType === 'info' && !this.config.includeInfo) continue;

        const relativePath = this.getRelativePath(filePath, projectPath);

        issues.push({
          id: this.generateIssueId(relativePath, lineIndex + 1, 'console'),
          file: relativePath,
          line: lineIndex + 1,
          column: match.index,
          severity: this.getSeverity(consoleType),
          category: 'console',
          title: `console.${consoleType} statement`,
          description: `Found console.${consoleType}() call that should be removed in production`,
          code: line.trim(),
          consoleType,
          autoFixAvailable: true,
          suggestedFix: `Remove or replace with proper logging: // ${line.trim()}`
        });
      }

      // Reset regex state
      consolePattern.lastIndex = 0;
    }

    return issues;
  }

  private getSeverity(consoleType: string): ConsoleIssue['severity'] {
    switch (consoleType) {
      case 'error':
        return 'high';
      case 'warn':
        return 'medium';
      case 'debug':
      case 'trace':
        return 'low';
      default:
        return 'medium';
    }
  }

  validateConfig(config: ConsoleAnalyzerConfig): ValidationResult {
    if (config.minCount !== undefined && config.minCount < 0) {
      return { valid: false, errors: ['minCount must be non-negative'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        includeDebug: {
          type: 'boolean',
          default: true,
          description: 'Include console.debug statements'
        },
        includeInfo: {
          type: 'boolean',
          default: true,
          description: 'Include console.info statements'
        },
        minCount: {
          type: 'number',
          default: 1,
          description: 'Minimum count to report (for aggregation)'
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

  getDefaultConfig(): ConsoleAnalyzerConfig {
    return {
      includeDebug: true,
      includeInfo: true,
      minCount: 1,
      excludePatterns: [],
      severity: 'medium'
    };
  }

  getOutputTypes(): string[] {
    return ['ConsoleIssue[]'];
  }
}

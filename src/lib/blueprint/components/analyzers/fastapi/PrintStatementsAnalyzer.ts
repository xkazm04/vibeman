/**
 * Print Statements Analyzer
 * Detects print() statements in Python files that should be replaced with proper logging
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { ConsoleIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface PrintStatementsAnalyzerConfig extends AnalyzerConfig {
  includeDebugPrints: boolean;
}

export class PrintStatementsAnalyzer extends BaseAnalyzer<PrintStatementsAnalyzerConfig, ConsoleIssue[]> {
  readonly id = 'analyzer.print-statements';
  readonly name = 'Print Statements';
  readonly description = 'Detect print() statements that should be replaced with proper logging';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    excludePatterns: ['**/test_*.py', '**/*_test.py'],
    tags: ['code-quality', 'debugging', 'python'],
  };

  async execute(_: void, context: ExecutionContext): Promise<ConsoleIssue[]> {
    this.context = context;
    const issues: ConsoleIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectPrintStatements(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} print statements`);
    return issues;
  }

  private detectPrintStatements(content: string, filePath: string, projectPath: string): ConsoleIssue[] {
    const issues: ConsoleIssue[] = [];
    const lines = content.split('\n');

    // Pattern for print() calls
    const printPattern = /\bprint\s*\(/g;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('#')) continue;

      let match;
      while ((match = printPattern.exec(line)) !== null) {
        const relativePath = this.getRelativePath(filePath, projectPath);

        issues.push({
          id: this.generateIssueId(relativePath, lineIndex + 1, 'print'),
          file: relativePath,
          line: lineIndex + 1,
          column: match.index,
          severity: 'low',
          category: 'console',
          title: 'print() statement',
          description: 'Found print() call that should be replaced with proper logging (logging module)',
          code: line.trim(),
          consoleType: 'log',
          autoFixAvailable: true,
          suggestedFix: `Replace print() with logging: logger.info(${line.trim().replace(/^print\s*\(/, '').replace(/\)$/, '')})`
        });
      }

      // Reset regex state
      printPattern.lastIndex = 0;
    }

    return issues;
  }

  validateConfig(config: PrintStatementsAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        includeDebugPrints: {
          type: 'boolean',
          default: true,
          description: 'Include debug print statements'
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          default: ['**/test_*.py', '**/*_test.py'],
          description: 'Additional patterns to exclude'
        }
      }
    };
  }

  getDefaultConfig(): PrintStatementsAnalyzerConfig {
    return {
      includeDebugPrints: true,
      excludePatterns: ['**/test_*.py', '**/*_test.py'],
      severity: 'low'
    };
  }

  getOutputTypes(): string[] {
    return ['ConsoleIssue[]'];
  }
}

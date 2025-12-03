/**
 * Error Handling Analyzer
 * Detects FastAPI endpoints lacking proper error handling
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { BaseIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface ErrorHandlingIssue extends BaseIssue {
  category: 'error-handling';
  endpointName?: string;
}

interface ErrorHandlingAnalyzerConfig extends AnalyzerConfig {
  requireHTTPException: boolean;
}

export class ErrorHandlingAnalyzer extends BaseAnalyzer<ErrorHandlingAnalyzerConfig, ErrorHandlingIssue[]> {
  readonly id = 'analyzer.fastapi-error-handling';
  readonly name = 'FastAPI Error Handling';
  readonly description = 'Detect FastAPI endpoints lacking proper error handling';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    tags: ['fastapi', 'maintainability', 'error-handling'],
  };

  async execute(_: void, context: ExecutionContext): Promise<ErrorHandlingIssue[]> {
    this.context = context;
    const issues: ErrorHandlingIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectMissingErrorHandling(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} endpoints lacking error handling`);
    return issues;
  }

  private detectMissingErrorHandling(content: string, filePath: string, projectPath: string): ErrorHandlingIssue[] {
    const issues: ErrorHandlingIssue[] = [];
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Check if file has FastAPI routes
    const hasRoutes = content.includes('@app.') || content.includes('@router.');
    if (!hasRoutes) return issues;

    // Check for try/except and HTTPException usage
    const hasTryCatch = content.includes('try:') || content.includes('except');
    const hasHTTPException = content.includes('HTTPException');

    // If file lacks both error handling patterns
    if (!hasTryCatch && !hasHTTPException) {
      // Find first route decorator line
      const lines = content.split('\n');
      let lineNumber = 1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('@app.') || lines[i].includes('@router.')) {
          lineNumber = i + 1;
          break;
        }
      }

      issues.push({
        id: this.generateIssueId(relativePath, lineNumber, 'error-handling'),
        file: relativePath,
        line: lineNumber,
        severity: 'medium',
        category: 'error-handling',
        title: 'Add error handling to endpoints',
        description: 'Endpoints lack error handling. Consider adding try/except blocks and raising HTTPException for errors.',
        code: 'No try/except or HTTPException found',
        autoFixAvailable: false,
        suggestedFix: `Add error handling:\ntry:\n    # endpoint logic\nexcept Exception as e:\n    raise HTTPException(status_code=500, detail=str(e))`
      });
    }

    return issues;
  }

  validateConfig(config: ErrorHandlingAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        requireHTTPException: {
          type: 'boolean',
          default: true,
          description: 'Require HTTPException usage (not just try/except)'
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

  getDefaultConfig(): ErrorHandlingAnalyzerConfig {
    return {
      requireHTTPException: true,
      excludePatterns: [],
      severity: 'medium'
    };
  }

  getOutputTypes(): string[] {
    return ['ErrorHandlingIssue[]'];
  }
}

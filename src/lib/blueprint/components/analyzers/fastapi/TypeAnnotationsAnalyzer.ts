/**
 * Type Annotations Analyzer
 * Detects Python functions missing return type annotations
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { AnyTypeIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface TypeAnnotationsAnalyzerConfig extends AnalyzerConfig {
  includeDunderMethods: boolean;
}

export class TypeAnnotationsAnalyzer extends BaseAnalyzer<TypeAnnotationsAnalyzerConfig, AnyTypeIssue[]> {
  readonly id = 'analyzer.python-type-annotations';
  readonly name = 'Python Type Annotations';
  readonly description = 'Detect functions missing return type annotations in Python files';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    tags: ['code-quality', 'type-safety', 'python'],
  };

  async execute(_: void, context: ExecutionContext): Promise<AnyTypeIssue[]> {
    this.context = context;
    const issues: AnyTypeIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectMissingAnnotations(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} functions missing type annotations`);
    return issues;
  }

  private detectMissingAnnotations(content: string, filePath: string, projectPath: string): AnyTypeIssue[] {
    const issues: AnyTypeIssue[] = [];
    const lines = content.split('\n');
    const relativePath = this.getRelativePath(filePath, projectPath);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();

      // Check for function definitions
      if ((line.startsWith('def ') || line.startsWith('async def ')) && !line.includes('->')) {
        // Skip dunder methods unless configured
        if (!this.config.includeDunderMethods && line.includes('def __')) {
          continue;
        }

        // Extract function name
        const funcMatch = line.match(/(?:async\s+)?def\s+(\w+)\s*\(/);
        const functionName = funcMatch ? funcMatch[1] : 'unknown';

        issues.push({
          id: this.generateIssueId(relativePath, lineIndex + 1, 'type-annotation'),
          file: relativePath,
          line: lineIndex + 1,
          severity: 'low',
          category: 'any-type',
          title: `Missing return type annotation: ${functionName}()`,
          description: `Function "${functionName}" is missing a return type annotation. Add type hints for better code clarity.`,
          code: line,
          variableName: functionName,
          autoFixAvailable: false,
          suggestedFix: `Add return type: def ${functionName}(...) -> ReturnType:`
        });
      }
    }

    return issues;
  }

  validateConfig(config: TypeAnnotationsAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        includeDunderMethods: {
          type: 'boolean',
          default: false,
          description: 'Include dunder methods (__init__, __str__, etc.)'
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

  getDefaultConfig(): TypeAnnotationsAnalyzerConfig {
    return {
      includeDunderMethods: false,
      excludePatterns: [],
      severity: 'low'
    };
  }

  getOutputTypes(): string[] {
    return ['AnyTypeIssue[]'];
  }
}

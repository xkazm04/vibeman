/**
 * Any Types Analyzer
 * Detects usage of 'any' type in TypeScript files
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { AnyTypeIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface AnyTypesAnalyzerConfig extends AnalyzerConfig {
  includeExplicitAny: boolean;
  includeImplicitAny: boolean;
}

export class AnyTypesAnalyzer extends BaseAnalyzer<AnyTypesAnalyzerConfig, AnyTypeIssue[]> {
  readonly id = 'analyzer.any-types';
  readonly name = 'Any Types';
  readonly description = 'Detect usage of "any" type in TypeScript files';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    filePatterns: ['**/*.ts', '**/*.tsx'],
    tags: ['code-quality', 'type-safety'],
  };

  async execute(_: void, context: ExecutionContext): Promise<AnyTypeIssue[]> {
    this.context = context;
    const issues: AnyTypeIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.ts', '**/*.tsx']);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectAnyTypes(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} any type usages`);
    return issues;
  }

  private detectAnyTypes(content: string, filePath: string, projectPath: string): AnyTypeIssue[] {
    const issues: AnyTypeIssue[] = [];
    const lines = content.split('\n');

    // Patterns for detecting 'any' type
    const anyPatterns = [
      /:\s*any\b/,           // Type annotation: variable: any
      /as\s+any\b/,          // Type assertion: value as any
      /<\s*any\s*>/,         // Generic: Array<any>
      /:\s*any\[\]/,         // Array type: variable: any[]
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      for (const pattern of anyPatterns) {
        if (pattern.test(line)) {
          const relativePath = this.getRelativePath(filePath, projectPath);

          // Try to extract variable name
          const varMatch = line.match(/(?:const|let|var|function|param\s+)?\s*(\w+)\s*:\s*any/);
          const variableName = varMatch ? varMatch[1] : undefined;

          issues.push({
            id: this.generateIssueId(relativePath, lineIndex + 1, 'any-type'),
            file: relativePath,
            line: lineIndex + 1,
            severity: this.config.severity || 'medium',
            category: 'any-type',
            title: 'any type usage',
            description: variableName
              ? `Variable "${variableName}" uses "any" type. Consider using a more specific type.`
              : 'Usage of "any" type detected. Consider using a more specific type.',
            code: line.trim(),
            variableName,
            autoFixAvailable: false,
            suggestedFix: 'Replace "any" with a specific type or use "unknown" if the type is truly unknown'
          });

          break; // Only report once per line
        }
      }
    }

    return issues;
  }

  validateConfig(config: AnyTypesAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        includeExplicitAny: {
          type: 'boolean',
          default: true,
          description: 'Include explicit "any" type annotations'
        },
        includeImplicitAny: {
          type: 'boolean',
          default: false,
          description: 'Include implicit "any" (requires TypeScript compiler)'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
          description: 'Severity level for any type issues'
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

  getDefaultConfig(): AnyTypesAnalyzerConfig {
    return {
      includeExplicitAny: true,
      includeImplicitAny: false,
      excludePatterns: [],
      severity: 'medium'
    };
  }

  getOutputTypes(): string[] {
    return ['AnyTypeIssue[]'];
  }
}

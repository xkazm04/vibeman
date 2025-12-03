/**
 * Complexity Analyzer
 * Detects functions with high cyclomatic complexity
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { ComplexityIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface ComplexityAnalyzerConfig extends AnalyzerConfig {
  threshold: number;
}

export class ComplexityAnalyzer extends BaseAnalyzer<ComplexityAnalyzerConfig, ComplexityIssue[]> {
  readonly id = 'analyzer.complexity';
  readonly name = 'Cyclomatic Complexity';
  readonly description = 'Detect functions with high cyclomatic complexity';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    tags: ['maintainability', 'code-quality'],
  };

  async execute(_: void, context: ExecutionContext): Promise<ComplexityIssue[]> {
    this.context = context;
    const issues: ComplexityIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Analyzing ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectHighComplexityFunctions(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} high complexity functions`);
    return issues;
  }

  private calculateCyclomaticComplexity(functionCode: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const decisionKeywords = [
      /\bif\b/g,
      /\belse if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g, // Ternary operator
    ];

    for (const pattern of decisionKeywords) {
      const matches = functionCode.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private detectHighComplexityFunctions(content: string, filePath: string, projectPath: string): ComplexityIssue[] {
    const issues: ComplexityIssue[] = [];
    const lines = content.split('\n');

    interface FunctionContext {
      startLine: number;
      code: string;
      name?: string;
    }

    const functionStack: FunctionContext[] = [];
    let globalBraceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('//')) continue;

      // Detect function declarations
      const functionPatterns = [
        /function\s+(\w+)\s*\(/,
        /const\s+(\w+)\s*=\s*(?:async\s+)?function/,
        /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
        /(\w+)\s*\([^)]*\)\s*{/, // Method
      ];

      let funcMatch = null;
      for (const pattern of functionPatterns) {
        funcMatch = trimmed.match(pattern);
        if (funcMatch) break;
      }

      if (funcMatch && trimmed.includes('{')) {
        const funcName = funcMatch[1] || 'anonymous';
        functionStack.push({
          startLine: i,
          code: '',
          name: funcName,
        });
      }

      // Accumulate function code
      if (functionStack.length > 0) {
        functionStack[functionStack.length - 1].code += line + '\n';
      }

      // Track braces
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;
      globalBraceDepth += openBraces - closeBraces;

      // Function end
      if (functionStack.length > 0 && closeBraces > 0) {
        if (trimmed === '}' || trimmed.startsWith('}')) {
          const currentFunc = functionStack[functionStack.length - 1];
          const complexity = this.calculateCyclomaticComplexity(currentFunc.code);

          if (complexity > this.config.threshold) {
            const relativePath = this.getRelativePath(filePath, projectPath);

            issues.push({
              id: this.generateIssueId(relativePath, currentFunc.startLine + 1, `complexity-${currentFunc.name}`),
              file: relativePath,
              line: currentFunc.startLine + 1,
              severity: this.getSeverity(complexity),
              category: 'complexity',
              title: `High complexity: ${currentFunc.name} (${complexity})`,
              description: `Function "${currentFunc.name}" has cyclomatic complexity of ${complexity}, exceeding threshold of ${this.config.threshold}.`,
              functionName: currentFunc.name || 'anonymous',
              complexity,
              threshold: this.config.threshold,
              autoFixAvailable: false,
              suggestedFix: 'Reduce complexity by extracting conditions into helper functions, using early returns, or simplifying logic'
            });
          }

          functionStack.pop();
        }
      }
    }

    return issues;
  }

  private getSeverity(complexity: number): ComplexityIssue['severity'] {
    if (complexity > 30) return 'critical';
    if (complexity > 20) return 'high';
    if (complexity > 15) return 'medium';
    return 'low';
  }

  validateConfig(config: ComplexityAnalyzerConfig): ValidationResult {
    if (config.threshold !== undefined && config.threshold < 1) {
      return { valid: false, errors: ['threshold must be at least 1'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          default: 10,
          minimum: 1,
          description: 'Maximum cyclomatic complexity before flagging a function'
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

  getDefaultConfig(): ComplexityAnalyzerConfig {
    return {
      threshold: 10,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['ComplexityIssue[]'];
  }
}

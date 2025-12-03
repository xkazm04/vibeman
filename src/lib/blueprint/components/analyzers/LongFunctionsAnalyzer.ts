/**
 * Long Functions Analyzer
 * Detects functions that exceed a configurable line count threshold
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { LongFunctionIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface LongFunctionsAnalyzerConfig extends AnalyzerConfig {
  threshold: number;
}

export class LongFunctionsAnalyzer extends BaseAnalyzer<LongFunctionsAnalyzerConfig, LongFunctionIssue[]> {
  readonly id = 'analyzer.long-functions';
  readonly name = 'Long Functions';
  readonly description = 'Detect functions that exceed a configurable line count threshold';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    tags: ['maintainability', 'code-structure'],
  };

  async execute(_: void, context: ExecutionContext): Promise<LongFunctionIssue[]> {
    this.context = context;
    const issues: LongFunctionIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Analyzing ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectLongFunctions(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} long functions`);
    return issues;
  }

  private detectLongFunctions(content: string, filePath: string, projectPath: string): LongFunctionIssue[] {
    const issues: LongFunctionIssue[] = [];
    const lines = content.split('\n');

    interface FunctionContext {
      startLine: number;
      initialBraceDepth: number;
      name: string;
    }

    const functionStack: FunctionContext[] = [];
    let globalBraceDepth = 0;
    let inComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and single-line comments
      if (trimmed === '' || trimmed.startsWith('//')) continue;

      // Detect multi-line comment start/end
      if (trimmed.includes('/*')) inComment = true;
      if (inComment) {
        if (trimmed.includes('*/')) inComment = false;
        continue;
      }

      // Detect function declarations
      const functionPatterns = [
        /^\s*function\s+(\w+)\s*\(/,                    // function name()
        /^\s*async\s+function\s+(\w+)\s*\(/,            // async function name()
        /^\s*(const|let|var)\s+(\w+)\s*=\s*function\s*\(/, // const name = function()
        /^\s*(const|let|var)\s+(\w+)\s*=\s*async\s*function\s*\(/, // const name = async function()
        /^\s*(const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/, // const name = () => {
        /^\s*(const|let|var)\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*{/, // const name = async () => {
        /^\s*(\w+)\s*\([^)]*\)\s*{/,                     // method() { (class methods)
        /^\s*async\s+(\w+)\s*\([^)]*\)\s*{/,            // async method() {
      ];

      let funcMatch = null;
      for (const pattern of functionPatterns) {
        funcMatch = trimmed.match(pattern);
        if (funcMatch) break;
      }

      if (funcMatch && trimmed.includes('{')) {
        const funcName = funcMatch[1] || funcMatch[2] || 'anonymous';
        functionStack.push({
          startLine: i,
          initialBraceDepth: globalBraceDepth,
          name: funcName,
        });
      }

      // Count braces (excluding braces in strings)
      let strippedLine = trimmed;
      strippedLine = strippedLine.replace(/"([^"\\]|\\.)*"/g, '');
      strippedLine = strippedLine.replace(/'([^'\\]|\\.)*'/g, '');
      strippedLine = strippedLine.replace(/`([^`\\]|\\.)*`/g, '');

      const openBraces = (strippedLine.match(/{/g) || []).length;
      const closeBraces = (strippedLine.match(/}/g) || []).length;

      globalBraceDepth += openBraces;
      globalBraceDepth -= closeBraces;

      // Check if we've closed a function
      if (functionStack.length > 0 && closeBraces > 0) {
        const currentFunc = functionStack[functionStack.length - 1];

        if (globalBraceDepth === currentFunc.initialBraceDepth) {
          const functionLength = i - currentFunc.startLine;

          if (functionLength > this.config.threshold) {
            const relativePath = this.getRelativePath(filePath, projectPath);

            issues.push({
              id: this.generateIssueId(relativePath, currentFunc.startLine + 1, `long-function-${currentFunc.name}`),
              file: relativePath,
              line: currentFunc.startLine + 1,
              severity: this.getSeverity(functionLength),
              category: 'long-function',
              title: `Long function: ${currentFunc.name} (${functionLength} lines)`,
              description: `Function "${currentFunc.name}" has ${functionLength} lines, exceeding the threshold of ${this.config.threshold} lines.`,
              functionName: currentFunc.name,
              lineCount: functionLength,
              threshold: this.config.threshold,
              autoFixAvailable: false,
              suggestedFix: 'Extract smaller helper functions or split into multiple focused functions'
            });
          }

          functionStack.pop();
        }
      }
    }

    return issues;
  }

  private getSeverity(lineCount: number): LongFunctionIssue['severity'] {
    const ratio = lineCount / this.config.threshold;
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  validateConfig(config: LongFunctionsAnalyzerConfig): ValidationResult {
    if (config.threshold !== undefined && config.threshold < 10) {
      return { valid: false, errors: ['threshold must be at least 10 lines'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          default: 50,
          minimum: 10,
          description: 'Maximum number of lines before flagging a function'
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

  getDefaultConfig(): LongFunctionsAnalyzerConfig {
    return {
      threshold: 50,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['LongFunctionIssue[]'];
  }
}

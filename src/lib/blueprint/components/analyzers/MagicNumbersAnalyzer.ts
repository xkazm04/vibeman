/**
 * Magic Numbers Analyzer
 * Detects magic numbers that should be extracted to named constants
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { MagicNumberIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface MagicNumbersAnalyzerConfig extends AnalyzerConfig {
  allowedNumbers: string[];
  skipTestFiles: boolean;
}

export class MagicNumbersAnalyzer extends BaseAnalyzer<MagicNumbersAnalyzerConfig, MagicNumberIssue[]> {
  readonly id = 'analyzer.magic-numbers';
  readonly name = 'Magic Numbers';
  readonly description = 'Detect magic numbers that should be extracted to named constants';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    tags: ['code-quality', 'maintainability'],
  };

  async execute(_: void, context: ExecutionContext): Promise<MagicNumberIssue[]> {
    this.context = context;
    const issues: MagicNumberIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectMagicNumbers(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} magic numbers`);
    return issues;
  }

  private detectMagicNumbers(content: string, filePath: string, projectPath: string): MagicNumberIssue[] {
    const issues: MagicNumberIssue[] = [];
    const lines = content.split('\n');
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Common exceptions - numbers that are typically OK to hardcode
    const allowedNumbers = new Set([
      '0', '1', '2', '-1',
      '10', '100', '1000',
      '0.0', '1.0', '0.5',
      '24', '60', // Time-related
      '365', // Days in year
      ...this.config.allowedNumbers
    ]);

    // Skip test files if configured
    if (this.config.skipTestFiles) {
      const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
                         content.includes('describe(') ||
                         content.includes('it(');
      if (isTestFile) {
        return [];
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments, imports, and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
          trimmed.startsWith('*') || trimmed.startsWith('import ')) {
        continue;
      }

      // Skip lines that are already constant declarations
      if (/^(const|let|var)\s+[A-Z_][A-Z0-9_]*\s*=/.test(trimmed)) {
        continue;
      }

      // Skip array/object indices
      if (/\[\d+\]/.test(trimmed)) {
        continue;
      }

      // Detect numeric literals
      const numberPattern = /\b(\d+\.?\d*|\d*\.\d+)\b/g;
      let match;

      while ((match = numberPattern.exec(trimmed)) !== null) {
        const number = match[1];

        // Skip allowed numbers
        if (allowedNumbers.has(number)) {
          continue;
        }

        // Skip very small numbers
        const numValue = parseFloat(number);
        if (numValue >= 0 && numValue <= 2) {
          continue;
        }

        // Skip numbers in property access (e.g., http2, md5)
        const beforeNumber = trimmed.substring(0, match.index);
        if (/[a-zA-Z_]$/.test(beforeNumber)) {
          continue;
        }

        // Get context around the number
        const contextStart = Math.max(0, match.index - 20);
        const contextEnd = Math.min(trimmed.length, match.index + number.length + 20);
        const context = trimmed.substring(contextStart, contextEnd).trim();

        // Determine severity and suggested name
        const { severity, suggestedName } = this.analyzeNumber(numValue, context);

        issues.push({
          id: this.generateIssueId(relativePath, i + 1, `magic-number-${number}`),
          file: relativePath,
          line: i + 1,
          column: match.index,
          severity,
          category: 'magic-number',
          title: `Magic number: ${number}`,
          description: `Numeric literal ${number} should be extracted to a named constant`,
          code: context,
          value: numValue,
          suggestedConstantName: suggestedName,
          autoFixAvailable: true,
          suggestedFix: suggestedName
            ? `const ${suggestedName} = ${number};`
            : `Extract ${number} to a named constant`
        });
      }
    }

    return issues;
  }

  private analyzeNumber(value: number, context: string): { severity: MagicNumberIssue['severity']; suggestedName?: string } {
    let severity: MagicNumberIssue['severity'] = 'low';
    let suggestedName: string | undefined;

    // High severity for likely configuration values
    if (value > 1000) {
      severity = 'high';
      if (context.includes('timeout') || context.includes('setTimeout')) {
        suggestedName = 'TIMEOUT_MS';
      } else if (context.includes('limit') || context.includes('max')) {
        suggestedName = 'MAX_LIMIT';
      } else if (context.includes('size') || context.includes('buffer')) {
        suggestedName = 'BUFFER_SIZE';
      }
    } else if (value >= 100) {
      severity = 'medium';
    }

    // Detect common patterns and suggest names
    if (!suggestedName) {
      if (context.includes('status') && value >= 100 && value < 600) {
        suggestedName = `HTTP_STATUS_${value}`;
        severity = 'medium';
      } else if (context.includes('port')) {
        suggestedName = 'PORT';
        severity = 'high';
      } else if (context.includes('delay') || context.includes('wait')) {
        suggestedName = 'DELAY_MS';
        severity = 'medium';
      } else if (context.includes('retries') || context.includes('attempts')) {
        suggestedName = 'MAX_RETRIES';
        severity = 'medium';
      } else if (context.includes('page') || context.includes('per')) {
        suggestedName = 'PAGE_SIZE';
        severity = 'medium';
      }
    }

    return { severity, suggestedName };
  }

  validateConfig(config: MagicNumbersAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        allowedNumbers: {
          type: 'array',
          items: { type: 'string' },
          default: [],
          description: 'Additional numbers to allow without flagging'
        },
        skipTestFiles: {
          type: 'boolean',
          default: true,
          description: 'Skip test files (they often have acceptable magic numbers)'
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

  getDefaultConfig(): MagicNumbersAnalyzerConfig {
    return {
      allowedNumbers: [],
      skipTestFiles: true,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['MagicNumberIssue[]'];
  }
}

/**
 * Dependency Injection Analyzer
 * Detects FastAPI endpoints with duplicate logic that could use Depends()
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { BaseIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface DependencyInjectionIssue extends BaseIssue {
  category: 'dependency-injection';
  duplicatePattern?: string;
}

interface DependencyInjectionAnalyzerConfig extends AnalyzerConfig {
  minDuplicateCount: number;
}

export class DependencyInjectionAnalyzer extends BaseAnalyzer<DependencyInjectionAnalyzerConfig, DependencyInjectionIssue[]> {
  readonly id = 'analyzer.dependency-injection';
  readonly name = 'Dependency Injection';
  readonly description = 'Detect FastAPI endpoints with duplicate logic that could use Depends()';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    tags: ['fastapi', 'architecture', 'DRY'],
  };

  async execute(_: void, context: ExecutionContext): Promise<DependencyInjectionIssue[]> {
    this.context = context;
    const issues: DependencyInjectionIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectDuplicateLogic(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} opportunities for dependency injection`);
    return issues;
  }

  private detectDuplicateLogic(content: string, filePath: string, projectPath: string): DependencyInjectionIssue[] {
    const issues: DependencyInjectionIssue[] = [];
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Check if file has FastAPI routes
    const hasRoutes = content.includes('@app.') || content.includes('@router.');
    if (!hasRoutes) return issues;

    // Check if already using Depends
    if (content.includes('Depends(')) return issues;

    // Look for common duplicate patterns
    const duplicatePatterns = [
      { pattern: 'Session()', name: 'Database session', minCount: 3 },
      { pattern: 'get_db()', name: 'Database connection', minCount: 3 },
      { pattern: 'get_current_user', name: 'User authentication', minCount: 2 },
      { pattern: 'verify_token', name: 'Token verification', minCount: 2 },
      { pattern: 'get_settings', name: 'Settings retrieval', minCount: 3 },
    ];

    for (const { pattern, name, minCount } of duplicatePatterns) {
      const count = content.split(pattern).length - 1;

      if (count >= Math.max(minCount, this.config.minDuplicateCount)) {
        // Find first occurrence line
        const lines = content.split('\n');
        let lineNumber = 1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(pattern)) {
            lineNumber = i + 1;
            break;
          }
        }

        issues.push({
          id: this.generateIssueId(relativePath, lineNumber, `dependency-injection-${pattern}`),
          file: relativePath,
          line: lineNumber,
          severity: 'medium',
          category: 'dependency-injection',
          title: `Use Depends() for ${name}`,
          description: `"${pattern}" appears ${count} times. Consider using FastAPI Depends() for shared dependencies to reduce duplication.`,
          code: `${pattern} (${count} occurrences)`,
          duplicatePattern: pattern,
          autoFixAvailable: false,
          suggestedFix: `Create a dependency function and use Depends(): def get_dependency(): ...; @app.get("/") async def endpoint(dep = Depends(get_dependency)): ...`
        });
      }
    }

    return issues;
  }

  validateConfig(config: DependencyInjectionAnalyzerConfig): ValidationResult {
    if (config.minDuplicateCount !== undefined && config.minDuplicateCount < 2) {
      return { valid: false, errors: ['minDuplicateCount must be at least 2'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        minDuplicateCount: {
          type: 'number',
          default: 3,
          minimum: 2,
          description: 'Minimum duplicate count before suggesting Depends()'
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

  getDefaultConfig(): DependencyInjectionAnalyzerConfig {
    return {
      minDuplicateCount: 3,
      excludePatterns: [],
      severity: 'medium'
    };
  }

  getOutputTypes(): string[] {
    return ['DependencyInjectionIssue[]'];
  }
}

/**
 * Async Endpoints Analyzer
 * Detects synchronous FastAPI endpoints that could benefit from async
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { BaseIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface AsyncEndpointIssue extends BaseIssue {
  category: 'async-endpoint';
  endpointName?: string;
}

interface AsyncEndpointsAnalyzerConfig extends AnalyzerConfig {
  checkAllEndpoints: boolean;
}

export class AsyncEndpointsAnalyzer extends BaseAnalyzer<AsyncEndpointsAnalyzerConfig, AsyncEndpointIssue[]> {
  readonly id = 'analyzer.async-endpoints';
  readonly name = 'Async Endpoints';
  readonly description = 'Detect synchronous FastAPI endpoints that could benefit from async';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    tags: ['fastapi', 'performance', 'async'],
  };

  async execute(_: void, context: ExecutionContext): Promise<AsyncEndpointIssue[]> {
    this.context = context;
    const issues: AsyncEndpointIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectSyncEndpoints(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} sync endpoints that could be async`);
    return issues;
  }

  private detectSyncEndpoints(content: string, filePath: string, projectPath: string): AsyncEndpointIssue[] {
    const issues: AsyncEndpointIssue[] = [];
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Check if file has FastAPI routes
    const hasRoutes = content.includes('@app.') || content.includes('@router.');
    if (!hasRoutes) return issues;

    // Check for async def usage
    const hasAsyncDef = /\n\s*async\s+def\s+\w+\s*\([^)]*\)\s*:/g.test(content);

    // If file already uses async, skip
    if (hasAsyncDef) return issues;

    // Look for sync def after route decorators
    const lines = content.split('\n');
    let isAfterDecorator = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for route decorators
      if (line.startsWith('@app.') || line.startsWith('@router.')) {
        isAfterDecorator = true;
        continue;
      }

      // Check for sync def after decorator
      if (isAfterDecorator && line.startsWith('def ')) {
        const funcMatch = line.match(/def\s+(\w+)\s*\(/);
        const functionName = funcMatch ? funcMatch[1] : 'unknown';

        issues.push({
          id: this.generateIssueId(relativePath, i + 1, 'async-endpoint'),
          file: relativePath,
          line: i + 1,
          severity: 'low',
          category: 'async-endpoint',
          title: `Consider async for ${functionName}()`,
          description: `Endpoint "${functionName}" is synchronous. Consider using async def for better performance with I/O operations.`,
          code: line,
          endpointName: functionName,
          autoFixAvailable: false,
          suggestedFix: `Change "def ${functionName}" to "async def ${functionName}" for better concurrency`
        });
      }

      // Reset decorator flag if not a decorator or def
      if (!line.startsWith('@') && !line.startsWith('def ')) {
        isAfterDecorator = false;
      }
    }

    return issues;
  }

  validateConfig(config: AsyncEndpointsAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        checkAllEndpoints: {
          type: 'boolean',
          default: false,
          description: 'Check all endpoints even if file has some async functions'
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

  getDefaultConfig(): AsyncEndpointsAnalyzerConfig {
    return {
      checkAllEndpoints: false,
      excludePatterns: [],
      severity: 'low'
    };
  }

  getOutputTypes(): string[] {
    return ['AsyncEndpointIssue[]'];
  }
}

/**
 * Pydantic Models Analyzer
 * Detects FastAPI endpoints using dict parameters instead of Pydantic models
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { BaseIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface PydanticModelIssue extends BaseIssue {
  category: 'pydantic';
  endpointName?: string;
}

interface PydanticModelsAnalyzerConfig extends AnalyzerConfig {
  checkRouterEndpoints: boolean;
}

export class PydanticModelsAnalyzer extends BaseAnalyzer<PydanticModelsAnalyzerConfig, PydanticModelIssue[]> {
  readonly id = 'analyzer.pydantic-models';
  readonly name = 'Pydantic Models';
  readonly description = 'Detect FastAPI endpoints using dict instead of Pydantic models';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    tags: ['fastapi', 'validation', 'api'],
  };

  async execute(_: void, context: ExecutionContext): Promise<PydanticModelIssue[]> {
    this.context = context;
    const issues: PydanticModelIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectDictParams(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} endpoints using dict instead of Pydantic`);
    return issues;
  }

  private detectDictParams(content: string, filePath: string, projectPath: string): PydanticModelIssue[] {
    const issues: PydanticModelIssue[] = [];
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Check if file has FastAPI routes
    const hasRoutes = content.includes('@app.') || content.includes('@router.');
    if (!hasRoutes) return issues;

    // Check if file already uses Pydantic
    const hasPydantic = content.includes('from pydantic import') || content.includes('BaseModel');

    // Look for dict parameters in endpoint functions
    const lines = content.split('\n');
    const dictParamPattern = /def\s+(\w+)\s*\([^)]*:\s*dict/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(dictParamPattern);

      if (match && !hasPydantic) {
        const functionName = match[1];

        issues.push({
          id: this.generateIssueId(relativePath, i + 1, 'pydantic-model'),
          file: relativePath,
          line: i + 1,
          severity: 'medium',
          category: 'pydantic',
          title: `Use Pydantic model in ${functionName}()`,
          description: `Endpoint "${functionName}" uses dict parameter. Consider using Pydantic models for automatic validation and documentation.`,
          code: line.trim(),
          endpointName: functionName,
          autoFixAvailable: false,
          suggestedFix: 'Create a Pydantic model (class MyModel(BaseModel):) and use it as parameter type'
        });
      }
    }

    return issues;
  }

  validateConfig(config: PydanticModelsAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        checkRouterEndpoints: {
          type: 'boolean',
          default: true,
          description: 'Check @router endpoints in addition to @app endpoints'
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

  getDefaultConfig(): PydanticModelsAnalyzerConfig {
    return {
      checkRouterEndpoints: true,
      excludePatterns: [],
      severity: 'medium'
    };
  }

  getOutputTypes(): string[] {
    return ['PydanticModelIssue[]'];
  }
}

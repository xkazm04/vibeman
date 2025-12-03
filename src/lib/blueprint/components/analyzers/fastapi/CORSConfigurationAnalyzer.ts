/**
 * CORS Configuration Analyzer
 * Detects FastAPI apps with missing or overly permissive CORS configuration
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { BaseIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface CORSIssue extends BaseIssue {
  category: 'cors';
  issueType: 'missing' | 'wildcard' | 'insecure';
}

interface CORSConfigurationAnalyzerConfig extends AnalyzerConfig {
  allowWildcardOrigins: boolean;
}

export class CORSConfigurationAnalyzer extends BaseAnalyzer<CORSConfigurationAnalyzerConfig, CORSIssue[]> {
  readonly id = 'analyzer.cors-configuration';
  readonly name = 'CORS Configuration';
  readonly description = 'Detect FastAPI apps with missing or overly permissive CORS';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/main.py', '**/app.py', '**/__init__.py'],
    tags: ['fastapi', 'security', 'cors'],
  };

  async execute(_: void, context: ExecutionContext): Promise<CORSIssue[]> {
    this.context = context;
    const issues: CORSIssue[] = [];

    // Only check main app files
    const files = await this.getProjectFiles(context.projectPath, ['**/main.py', '**/app.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectCORSIssues(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} CORS configuration issues`);
    return issues;
  }

  private detectCORSIssues(content: string, filePath: string, projectPath: string): CORSIssue[] {
    const issues: CORSIssue[] = [];
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Check if file creates FastAPI app
    const hasFastAPI = content.includes('FastAPI()');
    if (!hasFastAPI) return issues;

    // Check for CORS middleware
    const hasCORS = content.includes('CORSMiddleware');
    const hasWildcardOrigins =
      content.includes("allow_origins=['*']") ||
      content.includes('allow_origins=["*"]') ||
      content.includes('allow_origins=["*",') ||
      content.includes("allow_origins=['*',");

    // Find FastAPI() line
    const lines = content.split('\n');
    let lineNumber = 1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('FastAPI()')) {
        lineNumber = i + 1;
        break;
      }
    }

    if (!hasCORS) {
      issues.push({
        id: this.generateIssueId(relativePath, lineNumber, 'cors-missing'),
        file: relativePath,
        line: lineNumber,
        severity: 'low',
        category: 'cors',
        title: 'Missing CORS middleware',
        description: 'No CORS middleware detected. Add CORSMiddleware if this API is accessed from browsers.',
        code: 'FastAPI() without CORSMiddleware',
        issueType: 'missing',
        autoFixAvailable: false,
        suggestedFix: `Add CORS middleware:\nfrom fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["https://yourdomain.com"],\n    allow_methods=["*"],\n    allow_headers=["*"],\n)`
      });
    } else if (hasWildcardOrigins && !this.config.allowWildcardOrigins) {
      // Find CORS configuration line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('allow_origins')) {
          lineNumber = i + 1;
          break;
        }
      }

      issues.push({
        id: this.generateIssueId(relativePath, lineNumber, 'cors-wildcard'),
        file: relativePath,
        line: lineNumber,
        severity: 'medium',
        category: 'cors',
        title: 'CORS allows all origins',
        description: 'CORS is configured with allow_origins=["*"]. Consider restricting to specific domains for security.',
        code: 'allow_origins=["*"]',
        issueType: 'wildcard',
        autoFixAvailable: false,
        suggestedFix: 'Replace ["*"] with specific allowed domains: allow_origins=["https://yourdomain.com", "https://app.yourdomain.com"]'
      });
    }

    return issues;
  }

  validateConfig(config: CORSConfigurationAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        allowWildcardOrigins: {
          type: 'boolean',
          default: false,
          description: 'Allow wildcard origins without warning (for development)'
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

  getDefaultConfig(): CORSConfigurationAnalyzerConfig {
    return {
      allowWildcardOrigins: false,
      excludePatterns: [],
      severity: 'medium'
    };
  }

  getOutputTypes(): string[] {
    return ['CORSIssue[]'];
  }
}

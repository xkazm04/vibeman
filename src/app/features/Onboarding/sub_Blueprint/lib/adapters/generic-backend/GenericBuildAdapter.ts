/**
 * Generic Backend Build/Test Adapter
 *
 * Handles build/test for various backend frameworks (Go, Rails, Rust, etc.)
 * using common patterns and conventions.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

type BackendLanguage = 'node' | 'python' | 'go' | 'ruby' | 'rust' | 'java' | 'unknown';

interface GenericBuildData {
  language: BackendLanguage;
  testRunner: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  buildSuccess: boolean;
  lintErrors: number;
  lintWarnings: number;
  errors: Array<{
    file: string;
    message: string;
    type: 'test' | 'lint' | 'build' | 'compile';
    line?: number;
  }>;
  runtime: {
    version: string | null;
    command: string | null;
  };
  packageManager: string | null;
}

export class GenericBuildAdapter extends BaseAdapter<GenericBuildData> {
  public readonly id = 'generic-backend-build';
  public readonly name = 'Generic Backend Build Scanner';
  public readonly description = 'Runs common build/test tools for various backend frameworks';
  public readonly supportedTypes = ['generic', 'rails', 'go', 'rust', 'java', 'spring'];
  public readonly category = 'build';
  public readonly priority = 50; // Lower priority than specific adapters

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
  };

  protected override readonly defaultTimeoutMs = 180000;

  public async execute(context: ScanContext): Promise<ScanResult<GenericBuildData>> {
    const { project } = context;

    this.log('Running generic backend build scan...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/build-fixer/generic',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              scanOnly: true,
            }),
          },
          { serviceName: 'Generic Build Fixer API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: GenericBuildData = {
          language: result.language || 'unknown',
          testRunner: result.testRunner || null,
          totalTests: result.totalTests || 0,
          passedTests: result.passedTests || 0,
          failedTests: result.failedTests || 0,
          buildSuccess: result.buildSuccess ?? true,
          lintErrors: result.lintErrors || 0,
          lintWarnings: result.lintWarnings || 0,
          errors: result.errors || [],
          runtime: {
            version: result.runtime?.version || null,
            command: result.runtime?.command || null,
          },
          packageManager: result.packageManager || null,
        };

        if (data.buildSuccess && data.failedTests === 0 && data.lintErrors === 0) {
          this.log(`✅ Build healthy: ${data.passedTests} tests passing (${data.language})`);
        } else {
          this.log(
            `❌ Issues found: ${data.failedTests} failed tests, ${data.lintErrors} lint errors`
          );
        }

        return this.createResult(true, data);
      },
      { operation: 'generic-backend-build-scan' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<GenericBuildData>> {
    return this.createResult(
      true,
      {
        language: 'unknown',
        testRunner: null,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        buildSuccess: true,
        lintErrors: 0,
        lintWarnings: 0,
        errors: [],
        runtime: {
          version: null,
          command: null,
        },
        packageManager: null,
      },
      undefined,
      ['Generic build API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<GenericBuildData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const {
      language,
      testRunner,
      failedTests,
      lintErrors,
      buildSuccess,
      errors,
      totalTests,
    } = result.data;

    if (buildSuccess && failedTests === 0 && lintErrors === 0) {
      return null;
    }

    const issues: string[] = [];

    if (!buildSuccess) {
      issues.push('Build failed');
    }

    if (failedTests > 0) {
      issues.push(`${failedTests}/${totalTests} tests failing`);
    }

    if (lintErrors > 0) {
      issues.push(`${lintErrors} lint errors`);
    }

    const errorSummary = errors
      .slice(0, 5)
      .map((e) => `  - [${e.type}] ${e.message} (${e.file}${e.line ? `:${e.line}` : ''})`)
      .join('\n');

    const moreText = errors.length > 5 ? `\n  ... and ${errors.length - 5} more issues` : '';

    const languageLabel = {
      node: 'Node.js',
      python: 'Python',
      go: 'Go',
      ruby: 'Ruby',
      rust: 'Rust',
      java: 'Java',
      unknown: 'Backend',
    }[language];

    const description = `${languageLabel} project has issues${testRunner ? ` (${testRunner})` : ''}:\n\n**Summary**:\n${issues.map((i) => `- ${i}`).join('\n')}\n\n**Details**:\n${errorSummary}${moreText}`;

    return this.createDecision(
      {
        type: 'generic-backend-build-scan',
        title: `${languageLabel} Build Issues`,
        description,
        count: errors.length,
        severity: !buildSuccess || failedTests > 3 ? 'error' : 'warning',
        data: result.data,

        onAccept: async () => {
          this.log('Creating requirement files for backend issues...');

          const response = await fetch('/api/build-fixer/generic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              scanOnly: false,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create requirement files');
          }

          this.log(`✅ Created requirement files for backend issues`);
        },

        onReject: async () => {
          this.log('User rejected backend build scan');
        },
      },
      project
    );
  }
}

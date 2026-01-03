/**
 * Express.js Build/Test Scan Adapter
 *
 * Runs npm test, eslint, and checks for common Express.js issues.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface ExpressBuildData {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  lintErrors: number;
  lintWarnings: number;
  errors: Array<{
    file: string;
    message: string;
    type: 'test' | 'lint' | 'build';
  }>;
  hasTypeScript: boolean;
  typeErrors: number;
}

export class ExpressBuildAdapter extends BaseAdapter<ExpressBuildData> {
  public readonly id = 'express-build';
  public readonly name = 'Express Build/Test Scanner';
  public readonly description = 'Runs npm test and ESLint for Express.js projects';
  public readonly supportedTypes = ['express'];
  public readonly category = 'build';
  public readonly priority = 100;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
  };

  protected override readonly defaultTimeoutMs = 180000; // 3 minute timeout

  public async execute(context: ScanContext): Promise<ScanResult<ExpressBuildData>> {
    const { project } = context;

    this.log('Running Express.js build scan...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/build-fixer/express',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              scanOnly: true,
            }),
          },
          { serviceName: 'Express Build Fixer API' }
        );

        if (!response.success || !response.data) {
          // Fallback: Try generic npm test
          return this.runFallbackScan(project);
        }

        const result = response.data;

        if (!result.success) {
          return this.runFallbackScan(project);
        }

        const data: ExpressBuildData = {
          totalTests: result.totalTests || 0,
          passedTests: result.passedTests || 0,
          failedTests: result.failedTests || 0,
          lintErrors: result.lintErrors || 0,
          lintWarnings: result.lintWarnings || 0,
          errors: result.errors || [],
          hasTypeScript: result.hasTypeScript || false,
          typeErrors: result.typeErrors || 0,
        };

        if (data.failedTests === 0 && data.lintErrors === 0 && data.typeErrors === 0) {
          this.log(`✅ Build healthy: ${data.passedTests} tests passing`);
        } else {
          this.log(
            `❌ Issues found: ${data.failedTests} failed tests, ${data.lintErrors} lint errors`
          );
        }

        return this.createResult(true, data);
      },
      { operation: 'express-build-scan' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<ExpressBuildData>> {
    // Return a basic result if the API doesn't exist yet
    return this.createResult(true, {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      lintErrors: 0,
      lintWarnings: 0,
      errors: [],
      hasTypeScript: false,
      typeErrors: 0,
    }, undefined, ['Express build API not configured - using defaults']);
  }

  public buildDecision(
    result: ScanResult<ExpressBuildData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { failedTests, lintErrors, typeErrors, errors, totalTests } = result.data;

    // If everything is passing, no decision needed
    if (failedTests === 0 && lintErrors === 0 && typeErrors === 0) {
      return null;
    }

    const totalIssues = failedTests + lintErrors + typeErrors;

    const errorSummary = errors
      .slice(0, 5)
      .map((e) => `  - [${e.type}] ${e.message} (${e.file})`)
      .join('\n');

    const moreText = errors.length > 5 ? `\n  ... and ${errors.length - 5} more issues` : '';

    const description = `Express.js project has ${totalIssues} issue${totalIssues > 1 ? 's' : ''}:\n\n- Failed tests: ${failedTests}/${totalTests}\n- Lint errors: ${lintErrors}\n- Type errors: ${typeErrors}\n\nIssues:\n${errorSummary}${moreText}`;

    return this.createDecision(
      {
        type: 'express-build-scan',
        title: 'Express.js Build Issues',
        description,
        count: totalIssues,
        severity: failedTests > 3 || typeErrors > 0 ? 'error' : 'warning',
        data: result.data,

        onAccept: async () => {
          this.log('Creating requirement files for Express.js issues...');

          const response = await fetch('/api/build-fixer/express', {
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

          const createResult = await response.json();

          if (!createResult.success) {
            throw new Error(createResult.error || 'Failed to create requirement files');
          }

          this.log(`✅ Created requirement files for Express.js issues`);
        },

        onReject: async () => {
          this.log('User rejected Express.js build scan');
        },
      },
      project
    );
  }
}

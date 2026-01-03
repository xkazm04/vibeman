/**
 * Django Build/Test Scan Adapter
 *
 * Runs pytest, manage.py check, and validates Django project configuration.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface DjangoBuildData {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  checkWarnings: number;
  checkErrors: number;
  migrationStatus: {
    pending: number;
    applied: number;
    conflicts: boolean;
  };
  errors: Array<{
    file: string;
    message: string;
    type: 'test' | 'check' | 'migration' | 'import';
    line?: number;
  }>;
  pythonVersion: string | null;
  djangoVersion: string | null;
}

export class DjangoBuildAdapter extends BaseAdapter<DjangoBuildData> {
  public readonly id = 'django-build';
  public readonly name = 'Django Build/Test Scanner';
  public readonly description = 'Runs pytest and manage.py check for Django projects';
  public readonly supportedTypes = ['django'];
  public readonly category = 'build';
  public readonly priority = 100;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
  };

  protected override readonly defaultTimeoutMs = 180000; // 3 minute timeout

  public async execute(context: ScanContext): Promise<ScanResult<DjangoBuildData>> {
    const { project } = context;

    this.log('Running Django build scan...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/build-fixer/django',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              scanOnly: true,
            }),
          },
          { serviceName: 'Django Build Fixer API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: DjangoBuildData = {
          totalTests: result.totalTests || 0,
          passedTests: result.passedTests || 0,
          failedTests: result.failedTests || 0,
          skippedTests: result.skippedTests || 0,
          checkWarnings: result.checkWarnings || 0,
          checkErrors: result.checkErrors || 0,
          migrationStatus: {
            pending: result.migrationStatus?.pending || 0,
            applied: result.migrationStatus?.applied || 0,
            conflicts: result.migrationStatus?.conflicts || false,
          },
          errors: result.errors || [],
          pythonVersion: result.pythonVersion || null,
          djangoVersion: result.djangoVersion || null,
        };

        const hasIssues =
          data.failedTests > 0 ||
          data.checkErrors > 0 ||
          data.migrationStatus.pending > 0 ||
          data.migrationStatus.conflicts;

        if (!hasIssues) {
          this.log(`✅ Build healthy: ${data.passedTests} tests passing`);
        } else {
          this.log(
            `❌ Issues found: ${data.failedTests} failed tests, ${data.checkErrors} check errors, ${data.migrationStatus.pending} pending migrations`
          );
        }

        return this.createResult(true, data);
      },
      { operation: 'django-build-scan' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<DjangoBuildData>> {
    return this.createResult(
      true,
      {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        checkWarnings: 0,
        checkErrors: 0,
        migrationStatus: {
          pending: 0,
          applied: 0,
          conflicts: false,
        },
        errors: [],
        pythonVersion: null,
        djangoVersion: null,
      },
      undefined,
      ['Django build API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<DjangoBuildData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const {
      failedTests,
      checkErrors,
      checkWarnings,
      migrationStatus,
      errors,
      totalTests,
      djangoVersion,
    } = result.data;

    // Check if everything is passing
    if (
      failedTests === 0 &&
      checkErrors === 0 &&
      migrationStatus.pending === 0 &&
      !migrationStatus.conflicts
    ) {
      return null;
    }

    const issues: string[] = [];

    if (failedTests > 0) {
      issues.push(`${failedTests}/${totalTests} tests failing`);
    }

    if (checkErrors > 0) {
      issues.push(`${checkErrors} check errors`);
    }

    if (checkWarnings > 0) {
      issues.push(`${checkWarnings} check warnings`);
    }

    if (migrationStatus.pending > 0) {
      issues.push(`${migrationStatus.pending} pending migrations`);
    }

    if (migrationStatus.conflicts) {
      issues.push('Migration conflicts detected');
    }

    const errorSummary = errors
      .slice(0, 5)
      .map((e) => `  - [${e.type}] ${e.message} (${e.file}${e.line ? `:${e.line}` : ''})`)
      .join('\n');

    const moreText = errors.length > 5 ? `\n  ... and ${errors.length - 5} more issues` : '';

    const description = `Django ${djangoVersion || 'project'} has issues:\n\n**Summary**:\n${issues.map((i) => `- ${i}`).join('\n')}\n\n**Details**:\n${errorSummary}${moreText}`;

    const severity =
      migrationStatus.conflicts || failedTests > 3 || checkErrors > 0 ? 'error' : 'warning';

    return this.createDecision(
      {
        type: 'django-build-scan',
        title: 'Django Build Issues',
        description,
        count: errors.length,
        severity,
        data: result.data,

        onAccept: async () => {
          this.log('Creating requirement files for Django issues...');

          const response = await fetch('/api/build-fixer/django', {
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

          this.log(`✅ Created requirement files for Django issues`);
        },

        onReject: async () => {
          this.log('User rejected Django build scan');
        },
      },
      project
    );
  }
}

/**
 * FastAPI Build/Test Scan Adapter
 *
 * Runs pytest and checks for test failures, import errors, and type issues.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface FastAPIBuildData {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: Array<{
    file: string;
    test: string;
    error: string;
  }>;
  typeErrors: number;
  importErrors: number;
}

export class FastAPIBuildAdapter extends BaseAdapter<FastAPIBuildData> {
  public readonly id = 'fastapi-build';
  public readonly name = 'FastAPI Build/Test Scanner';
  public readonly description = 'Runs pytest and checks for test failures and errors';
  public readonly supportedTypes = ['fastapi'];
  public readonly category = 'build';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<FastAPIBuildData>> {
    const { project } = context;

    this.log('Running FastAPI tests...', project.path);

    try {
      const response = await this.fetchApi('/api/build-fixer/fastapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.path,
          scanOnly: true, // Just scan, don't create requirements yet
        }),
      });

      if (!response.success || !response.data) {
        return this.createResult(false, undefined, response.error || 'FastAPI build scan failed');
      }

      const result = response.data as any;

      if (!result.success) {
        return this.createResult(false, undefined, result.error || 'FastAPI build scan failed');
      }

      const data: FastAPIBuildData = {
        totalTests: result.totalTests || 0,
        passedTests: result.passedTests || 0,
        failedTests: result.failedTests || 0,
        errors: result.errors || [],
        typeErrors: result.typeErrors || 0,
        importErrors: result.importErrors || 0,
      };

      if (data.failedTests === 0 && data.typeErrors === 0 && data.importErrors === 0) {
        this.log(`✅ All tests passing: ${data.passedTests}/${data.totalTests}`);
      } else {
        this.log(
          `❌ Issues found: ${data.failedTests} failed tests, ${data.typeErrors} type errors, ${data.importErrors} import errors`
        );
      }

      return this.createResult(true, data);
    } catch (error) {
      this.error('FastAPI build scan failed:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  public buildDecision(
    result: ScanResult<FastAPIBuildData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { totalTests, passedTests, failedTests, errors, typeErrors, importErrors } = result.data;

    // If everything is passing, no decision needed
    if (failedTests === 0 && typeErrors === 0 && importErrors === 0) {
      return null;
    }

    const totalIssues = failedTests + typeErrors + importErrors;

    const errorSummary = errors
      .slice(0, 3)
      .map((e) => `  - ${e.test} (${e.file})`)
      .join('\n');

    const moreText = errors.length > 3 ? `\n  ... and ${errors.length - 3} more errors` : '';

    const description = `FastAPI project has ${totalIssues} issue${totalIssues > 1 ? 's' : ''}:\n\n- Failed tests: ${failedTests}/${totalTests}\n- Type errors: ${typeErrors}\n- Import errors: ${importErrors}\n\nFailing tests:\n${errorSummary}${moreText}`;

    return this.createDecision(
      {
        type: 'fastapi-build-scan',
        title: 'FastAPI Test Failures',
        description,
        count: totalIssues,
        severity: failedTests > 5 || importErrors > 0 ? 'error' : 'warning',
        data: result.data,

        // Accept: Create requirement files
        onAccept: async () => {
          this.log('Creating requirement files for FastAPI issues...');

          const response = await fetch('/api/build-fixer/fastapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              scanOnly: false, // Create requirements
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create requirement files');
          }

          const createResult = await response.json();

          if (!createResult.success) {
            throw new Error(createResult.error || 'Failed to create requirement files');
          }

          const filesCreated = createResult.requirementFiles?.length || 0;
          this.log(`✅ Created ${filesCreated} requirement files`);
        },

        // Reject: Log rejection
        onReject: async () => {
          this.log('User rejected FastAPI build scan');
        },
      },
      project
    );
  }
}

/**
 * NextJS Build Scan Adapter
 *
 * Scans for build errors and warnings in NextJS projects.
 * Creates requirement files for fixing detected issues.
 *
 * Uses centralized error handling for consistent error messages
 * and automatic retry logic for transient failures.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface BuildScanData {
  totalErrors: number;
  totalWarnings: number;
  errorGroups: unknown[];
  buildCommand: string;
}

export class NextJSBuildAdapter extends BaseAdapter<BuildScanData> {
  public readonly id = 'nextjs-build';
  public readonly name = 'NextJS Build Scanner';
  public readonly description = 'Scans NextJS projects for build errors and warnings';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'build';
  public readonly priority = 100; // High priority for NextJS projects

  /** Custom retry config for build scans - longer timeout due to potentially long builds */
  protected override readonly retryConfig = {
    maxRetries: 2, // Build scans are expensive, limit retries
    initialDelayMs: 2000,
    maxDelayMs: 30000,
  };

  protected override readonly defaultTimeoutMs = 120000; // 2 minute timeout for builds

  public async execute(context: ScanContext): Promise<ScanResult<BuildScanData>> {
    const { project } = context;

    this.log('Executing build scan...', project.path);

    // Use centralized error handling with automatic retry
    return this.executeWithErrorHandling(
      async () => {
        const result = await this.fetchApi<any>(
          '/api/build-fixer?scanOnly=true',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
            }),
          },
          { serviceName: 'Build Fixer API' }
        );

        if (!result.success || !result.data) {
          return this.createResult<BuildScanData>(
            false,
            undefined,
            result.error || 'Build scan failed'
          );
        }

        const data = result.data;

        if (!data.success) {
          return this.createResult<BuildScanData>(
            false,
            undefined,
            data.error || 'Build scan failed'
          );
        }

        const buildData: BuildScanData = {
          totalErrors: data.totalErrors || 0,
          totalWarnings: data.totalWarnings || 0,
          errorGroups: data.errorGroups || [],
          buildCommand: data.buildCommand || 'npm run build',
        };

        this.log(
          `✅ Build scan complete: ${buildData.totalErrors} errors, ${buildData.totalWarnings} warnings`
        );

        return this.createResult(true, buildData);
      },
      { operation: 'build-scan' }
    );
  }

  public buildDecision(result: ScanResult<BuildScanData>, project: Project): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { totalErrors, totalWarnings, errorGroups, buildCommand } = result.data;

    // If no errors, no decision needed
    if (totalErrors === 0) {
      return null;
    }

    // Calculate potential files
    const potentialFiles =
      errorGroups && errorGroups.length > 0
        ? errorGroups.length
        : Math.min(totalErrors, 10); // Estimate: max 10 files

    const description = `Found ${totalErrors} build error${totalErrors > 1 ? 's' : ''} and ${totalWarnings} warning${totalWarnings > 1 ? 's' : ''}.\n\nBuild command: ${buildCommand}\n\nThis will create ${potentialFiles} Claude Code requirement file${potentialFiles !== 1 ? 's' : ''} for fixing.`;

    return this.createDecision(
      {
        type: 'build-scan',
        title: 'Build Errors Detected',
        description,
        count: potentialFiles,
        severity: totalErrors > 10 ? 'error' : totalErrors > 5 ? 'warning' : 'info',
        data: { totalErrors, totalWarnings, errorGroups, buildCommand },

        // Accept: Create requirement files
        onAccept: async () => {
          this.log('Creating requirement files...');

          const response = await fetch('/api/build-fixer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
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
          this.log('User rejected build scan');
        },
      },
      project
    );
  }
}

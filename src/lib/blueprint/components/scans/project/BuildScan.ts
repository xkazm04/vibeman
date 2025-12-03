/**
 * Build Scan Component
 * Scans project for build errors using Web Workers and adapter system
 *
 * Migrated from:
 * src/app/features/Onboarding/sub_Blueprint/lib/blueprintBuildScan.ts
 *
 * Execution flow:
 * 1. Execute build scan via Web Worker (offloads to background thread)
 * 2. Use adapter system to build decision based on project type
 * 3. Show errors/warnings with fix options
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';

/**
 * Build scan configuration
 */
export interface BuildScanConfig extends ScanConfig {
  projectType: string;
}

/**
 * Build error group
 */
export interface BuildErrorGroup {
  file: string;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    code?: string;
  }>;
}

/**
 * Build scan result data
 */
export interface BuildScanData {
  totalErrors: number;
  totalWarnings: number;
  errorGroups: BuildErrorGroup[];
  buildCommand: string;
}

/**
 * Build Scan Component
 * Detects build errors and creates fix requirements
 */
export class BuildScan extends BaseScan<BuildScanConfig, BuildScanData> {
  readonly id = 'scan.build';
  readonly name = 'Build Scan';
  readonly description = 'Scan project for build errors and TypeScript issues';
  readonly executionMode = 'direct' as const;
  readonly category = 'project' as const;
  readonly requiresContext = false;

  // Metadata
  readonly icon = 'Hammer';
  readonly color = '#3b82f6';  // Blue
  readonly tags = ['project', 'build', 'typescript', 'errors'];
  readonly supportedProjectTypes = ['nextjs', 'react', 'node'];

  /**
   * Execute the build scan
   */
  async execute(): Promise<ScanResult<BuildScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(0, 'Starting build scan...');
    this.log('info', `Starting build scan for project: ${this.config.projectPath}`);

    try {
      // Call the build scan API
      const result = await this.postJson<{
        success: boolean;
        data?: BuildScanData;
        error?: string;
      }>('/api/build-fixer/scan', {
        projectPath: this.config.projectPath,
        projectType: this.config.projectType,
      });

      this.reportProgress(100, 'Scan complete');

      if (!result.success || !result.data?.success) {
        return this.errorResult(result.data?.error || result.error || 'Build scan failed');
      }

      const data = result.data.data;
      if (!data) {
        return this.successResult({
          totalErrors: 0,
          totalWarnings: 0,
          errorGroups: [],
          buildCommand: 'npm run build',
        });
      }

      this.log('info', `Found ${data.totalErrors} errors, ${data.totalWarnings} warnings`);

      return this.successResult(data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Build scan failed unexpectedly';
      this.log('error', errorMsg);
      return this.errorResult(errorMsg);
    }
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<BuildScanData>): DecisionData<BuildScanData> | null {
    if (!result.success) {
      return {
        type: 'build-scan-error',
        title: 'Build Scan Failed',
        description: `An error occurred:\n\n${result.error || 'Unknown error'}`,
        severity: 'error',
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    if (!result.data) {
      return null;
    }

    const { totalErrors, totalWarnings, errorGroups, buildCommand } = result.data;

    // No build errors
    if (totalErrors === 0 && totalWarnings === 0) {
      return {
        type: 'build-scan-success',
        title: 'Build Successful',
        description: 'No build errors or warnings detected. Your project builds cleanly!',
        count: 0,
        severity: 'info',
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
        data: result.data,
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    // Format error groups for display
    const errorSummary = errorGroups
      .slice(0, 5)
      .map((group) => {
        const errorCount = group.errors.length;
        return `- \`${group.file}\`: ${errorCount} error${errorCount > 1 ? 's' : ''}`;
      })
      .join('\n');

    const moreText = errorGroups.length > 5
      ? `\n... and ${errorGroups.length - 5} more files`
      : '';

    const description = `**Build Command**: \`${buildCommand}\`
**Total Errors**: ${totalErrors}
**Total Warnings**: ${totalWarnings}
**Files with Errors**: ${errorGroups.length}

**Top Error Files**:
${errorSummary}${moreText}

Click **Accept** to create a Claude Code requirement for fixing these build errors.`;

    const severity: 'info' | 'warning' | 'error' =
      totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'info';

    return {
      type: 'build-scan-result',
      title: totalErrors > 0 ? 'Build Errors Detected' : 'Build Warnings Detected',
      description,
      count: totalErrors + totalWarnings,
      severity,
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      data: result.data,
      onAccept: async () => {
        // Create fix requirement
        await this.createFixRequirement(result.data!);
      },
      onReject: async () => {
        this.log('info', 'User dismissed build scan results');
      },
    };
  }

  /**
   * Create a Claude Code requirement for fixing build errors
   */
  private async createFixRequirement(data: BuildScanData): Promise<void> {
    const errorList = data.errorGroups
      .flatMap((group) =>
        group.errors.map((e) => `- ${group.file}:${e.line}:${e.column} - ${e.message}`)
      )
      .slice(0, 50)
      .join('\n');

    const moreErrors = data.totalErrors > 50
      ? `\n... and ${data.totalErrors - 50} more errors`
      : '';

    const promptContent = `# Fix Build Errors

## Objective
Fix the build errors detected in this project.

## Build Command
\`${data.buildCommand}\`

## Statistics
- Total Errors: ${data.totalErrors}
- Total Warnings: ${data.totalWarnings}
- Files Affected: ${data.errorGroups.length}

## Errors to Fix

${errorList}${moreErrors}

## Instructions

1. **Analyze each error** to understand the root cause
2. **Fix errors in priority order**:
   - Type errors first (TypeScript)
   - Import/export errors
   - Syntax errors
   - Other errors
3. **Run the build** after each batch of fixes to verify
4. **Document any significant changes** in comments

## Verification

After fixing, run:
\`\`\`bash
${data.buildCommand}
\`\`\`

The build should complete without errors.

Generated by Blueprint Build Scan
`;

    const result = await this.postJson<{ success: boolean; filePath: string; error?: string }>(
      '/api/claude-code/requirement',
      {
        projectPath: this.config.projectPath,
        requirementName: `build-fix-${Date.now()}`,
        content: promptContent,
        overwrite: false,
      }
    );

    if (!result.success || !result.data?.success) {
      throw new Error(result.data?.error || 'Failed to create fix requirement');
    }

    this.log('info', `Created fix requirement: ${result.data.filePath}`);
  }

  /**
   * Validate configuration
   */
  validateConfig(): ValidationResult {
    const errors: string[] = [];

    if (!this.config.projectId) {
      errors.push('projectId is required');
    }

    if (!this.config.projectPath) {
      errors.push('projectPath is required');
    }

    if (!this.config.projectType) {
      errors.push('projectType is required');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}

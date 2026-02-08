/**
 * Photo Scan Component
 * Takes screenshots based on context test scenarios
 *
 * Migrated from:
 * src/app/features/Onboarding/blueprint/lib/context-scans/blueprintPhotoScan.ts
 *
 * Execution flow:
 * 1. Check if context has a test scenario (scanOnly: true)
 * 2. Show decision with scenario status
 * 3. If accepted, execute screenshot (scanOnly: false)
 *
 * This scan uses 'direct' execution mode - no requirement file created
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';

/**
 * Photo scan configuration
 */
export interface PhotoScanConfig extends ScanConfig {
  contextId: string;
  contextName?: string;
}

/**
 * Photo scan result data
 */
export interface PhotoScanData {
  contextId: string;
  contextName: string;
  hasScenario: boolean;
  daysAgo: number | null;
  screenshotPath?: string;
}

/**
 * Photo Scan Component
 * Takes screenshots of context UI based on test scenarios
 */
export class PhotoScan extends BaseScan<PhotoScanConfig, PhotoScanData> {
  readonly id = 'scan.photo';
  readonly name = 'Photo Scan';
  readonly description = 'Take screenshots of context UI based on test scenarios';
  readonly executionMode = 'direct' as const;
  readonly category = 'context' as const;
  readonly requiresContext = true;

  // Metadata
  readonly icon = 'Camera';
  readonly color = '#f59e0b';  // Amber
  readonly tags = ['screenshot', 'ui', 'visual', 'testing'];
  readonly supportedProjectTypes = ['*'];

  private scanData: PhotoScanData | null = null;

  /**
   * Execute the photo scan (pre-check phase)
   */
  async execute(): Promise<ScanResult<PhotoScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(10, 'Checking test scenario...');
    this.log('info', `Starting photo scan for context: ${this.config.contextId}`);

    // Check if context has a test scenario
    const checkResult = await this.checkTestScenario();

    if (!checkResult.success) {
      return this.errorResult(checkResult.error || 'Failed to check test scenario');
    }

    this.scanData = checkResult.data!;
    this.reportProgress(100, 'Scan complete');

    return this.successResult(this.scanData);
  }

  /**
   * Execute the screenshot after user confirmation
   */
  async executeScreenshot(): Promise<ScanResult<PhotoScanData>> {
    if (!this.scanData) {
      return this.errorResult('No scan data available. Run execute() first.');
    }

    if (!this.scanData.hasScenario) {
      return this.errorResult('Context does not have a test scenario');
    }

    this.reportProgress(20, 'Executing screenshot...');
    this.log('info', 'Taking screenshot');

    const result = await this.postJson<{
      success: boolean;
      screenshotPath?: string;
      error?: string;
    }>('/api/tester/screenshot', {
      contextId: this.config.contextId,
      scanOnly: false,
    });

    if (!result.success || !result.data?.success) {
      const error = result.error || result.data?.error || 'Failed to execute screenshot';
      return this.errorResult(error);
    }

    this.reportProgress(100, 'Screenshot complete');

    return this.successResult({
      ...this.scanData,
      screenshotPath: result.data.screenshotPath,
    });
  }

  /**
   * Check if context has a test scenario
   */
  private async checkTestScenario(): Promise<{
    success: boolean;
    data?: PhotoScanData;
    error?: string;
  }> {
    const result = await this.postJson<{
      success: boolean;
      contextId: string;
      contextName: string;
      hasScenario: boolean;
      daysAgo: number | null;
      error?: string;
    }>('/api/tester/screenshot', {
      contextId: this.config.contextId,
      scanOnly: true,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data?.success) {
      return { success: false, error: result.data?.error || 'API check failed' };
    }

    return {
      success: true,
      data: {
        contextId: result.data.contextId,
        contextName: result.data.contextName || this.config.contextName || 'Unknown',
        hasScenario: result.data.hasScenario,
        daysAgo: result.data.daysAgo,
      },
    };
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<PhotoScanData>): DecisionData<PhotoScanData> | null {
    if (!result.success || !result.data) {
      return {
        type: 'photo-scan-error',
        title: 'Photo Scan Failed',
        description: result.error || 'Failed to check test scenario',
        severity: 'error',
        contextId: this.config.contextId,
        onAccept: async () => {},
      };
    }

    const { contextName, hasScenario, daysAgo } = result.data;

    // If no scenario, show abort message
    if (!hasScenario) {
      return {
        type: 'photo-scan-abort',
        title: 'No Test Scenario Found',
        description: `Context "${contextName}" does not have a test scenario.\n\nPlease create a test scenario first using the Test Design scan or Context Preview Manager.`,
        severity: 'warning',
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
        contextId: this.config.contextId,
        data: result.data,
        onAccept: async () => {
          // User acknowledged - no action needed
        },
        onReject: async () => {
          // User cancelled
        },
      };
    }

    // Build description with last updated info
    let description = `Context: "${contextName}"\n\nTest scenario found.`;
    if (daysAgo !== null) {
      description += `\nLast screenshot: ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
    } else {
      description += '\nNo previous screenshot found.';
    }
    description += '\n\nExecute screenshot now?';

    return {
      type: 'photo-scan',
      title: 'Execute Screenshot',
      description,
      severity: 'info',
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      contextId: this.config.contextId,
      data: result.data,
      onAccept: async () => {
        // Execute the actual screenshot
        const screenshotResult = await this.executeScreenshot();
        if (!screenshotResult.success) {
          throw new Error(screenshotResult.error || 'Failed to execute screenshot');
        }
      },
      onReject: async () => {
        this.log('info', 'Screenshot cancelled by user');
      },
    };
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

    if (!this.config.contextId) {
      errors.push('contextId is required for photo scan');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}

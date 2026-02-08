/**
 * Test Scan Component
 * Generates and executes automated Playwright tests using Claude Code
 *
 * Migrated from:
 * src/app/features/Onboarding/blueprint/lib/context-scans/blueprintTestScan.ts
 *
 * Execution flow:
 * 1. Fetch context information
 * 2. Build requirement content via API (server-side)
 * 3. Execute pipeline with polling (wait for completion)
 * 4. Return decision with test results
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { PipelineExecutor } from '../../../pipeline/PipelineExecutor';

/**
 * Test scan configuration
 */
export interface TestScanConfig extends ScanConfig {
  contextId: string;
  contextName?: string;
}

/**
 * Test scan result data
 */
export interface TestScanData {
  taskId: string;
  requirementPath: string;
  contextId: string;
  contextName: string;
  reportPath?: string;
}

/**
 * Test Scan Component
 * Executes automated Playwright tests for a context
 */
export class TestScan extends BaseScan<TestScanConfig, TestScanData> {
  readonly id = 'scan.test';
  readonly name = 'Test Scan';
  readonly description = 'Generate and execute automated Playwright tests for a context';
  readonly executionMode = 'polling' as const;
  readonly category = 'context' as const;
  readonly requiresContext = true;

  // Metadata
  readonly icon = 'Play';
  readonly color = '#10b981';  // Emerald
  readonly tags = ['testing', 'playwright', 'automation', 'e2e'];
  readonly supportedProjectTypes = ['*'];

  private pipeline = new PipelineExecutor();
  private contextName: string = '';

  /**
   * Execute the test scan
   */
  async execute(): Promise<ScanResult<TestScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(5, 'Fetching context information...');
    this.log('info', `Starting test scan for context: ${this.config.contextId}`);

    // Step 1: Fetch context information
    const contextResult = await this.fetchContextInfo();
    if (!contextResult.success) {
      return this.errorResult(contextResult.error || 'Failed to fetch context information');
    }
    this.contextName = contextResult.contextName!;

    this.reportProgress(10, 'Building test requirement...');

    // Step 2: Build requirement content via API
    const buildResult = await this.buildRequirement();
    if (!buildResult.success) {
      return this.errorResult(buildResult.error || 'Failed to build requirement content');
    }

    this.reportProgress(15, 'Executing test pipeline...');

    // Step 3: Execute pipeline with polling
    const pipelineResult = await this.pipeline.execute({
      projectPath: this.config.projectPath,
      projectId: this.config.projectId,
      requirementName: `test-${this.config.contextId}`,
      requirementContent: buildResult.content!,
      executionMode: 'polling',
      onProgress: (progress, message) => {
        // Map pipeline progress (0-100) to our range (15-100)
        const mappedProgress = 15 + (progress * 0.85);
        this.reportProgress(mappedProgress, message);
      },
    });

    if (!pipelineResult.success) {
      this.log('error', `Test scan failed: ${pipelineResult.error}`);
      return this.errorResult(pipelineResult.error || 'Pipeline execution failed');
    }

    this.log('info', 'Test scan completed successfully');

    return this.successResult({
      taskId: pipelineResult.taskId || '',
      requirementPath: pipelineResult.requirementPath || '',
      contextId: this.config.contextId,
      contextName: this.contextName,
      reportPath: `.claude/commands/test-report-${this.config.contextId}.md`,
    });
  }

  /**
   * Fetch context information
   */
  private async fetchContextInfo(): Promise<{
    success: boolean;
    contextName?: string;
    error?: string;
  }> {
    const result = await this.fetchJson<{ name: string }>(
      `/api/contexts/${this.config.contextId}`
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      contextName: result.data?.name || this.config.contextName || 'Unknown Context',
    };
  }

  /**
   * Build requirement content via API
   */
  private async buildRequirement(): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    const result = await this.postJson<{
      success: boolean;
      requirementContent?: string;
      error?: string;
    }>('/api/blueprint/test-requirement', {
      contextId: this.config.contextId,
      projectId: this.config.projectId,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data?.success || !result.data?.requirementContent) {
      return { success: false, error: result.data?.error || 'No requirement content returned' };
    }

    return { success: true, content: result.data.requirementContent };
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<TestScanData>): DecisionData<TestScanData> | null {
    if (!result.success) {
      return {
        type: 'test-scan-error',
        title: 'Test Scan Failed',
        description: `An error occurred while running the test scan:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
        severity: 'error',
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
        contextId: this.config.contextId,
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    if (!result.data) {
      return null;
    }

    const { taskId, contextName, contextId, reportPath } = result.data;

    return {
      type: 'test-scan',
      title: 'Test Scan Completed',
      description: `Claude Code has completed automated testing for **${contextName}**.

**Task ID**: ${taskId}

**Test Process Completed:**
- Environment diagnostics
- Test scenario analysis
- Playwright test execution
- Screenshot capture
- Issue documentation

**Generated Artifacts:**
- Test requirement file
- Test execution results
- Issue report with severity levels
- Process improvement suggestions

**Report Location**: \`${reportPath}\`

Click **Accept** to acknowledge completion.`,
      severity: 'info',
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      contextId,
      count: 1,
      data: result.data,
      onAccept: async () => {
        this.log('info', 'User acknowledged test completion');
      },
      onReject: async () => {
        this.log('info', 'User dismissed test notification');
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
      errors.push('contextId is required for test scan');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  /**
   * Cancel the scan
   */
  cancel(): void {
    super.cancel();
    this.pipeline.cancel();
  }
}

/**
 * Separator Scan Component
 * Intelligently separates large contexts into smaller, focused contexts (max 10 files each)
 *
 * Migrated from:
 * src/app/features/Onboarding/blueprint/lib/context-scans/blueprintSeparatorScan.ts
 *
 * Execution flow:
 * 1. Fetch context details (pre-scan)
 * 2. Show decision with context info and file count
 * 3. If accepted, build prompt and execute pipeline with polling
 * 4. Create success event
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { PipelineExecutor } from '../../../pipeline/PipelineExecutor';
import { buildSeparatorPrompt } from '../../../prompts/templates/separatorPrompt';

/**
 * Separator scan configuration
 */
export interface SeparatorScanConfig extends ScanConfig {
  contextId: string;
  contextName?: string;
}

/**
 * Context details from API
 */
interface ContextDetails {
  id: string;
  name: string;
  description: string;
  file_paths: string | string[];
  updated_at: string;
}

/**
 * Separator scan result data
 */
export interface SeparatorScanData {
  contextId: string;
  contextName: string;
  fileCount: number;
  updatedAt: string;
  requirementPath?: string;
  taskId?: string;
}

/**
 * Separator Scan Component
 * Splits large contexts into smaller, focused contexts
 */
export class SeparatorScan extends BaseScan<SeparatorScanConfig, SeparatorScanData> {
  readonly id = 'scan.separator';
  readonly name = 'Separator Scan';
  readonly description = 'Intelligently separate large contexts into smaller, focused contexts (max 10 files each)';
  readonly executionMode = 'polling' as const;
  readonly category = 'context' as const;
  readonly requiresContext = true;

  // Metadata
  readonly icon = 'Scissors';
  readonly color = '#ec4899';  // Pink
  readonly tags = ['context', 'organization', 'refactor', 'maintenance'];
  readonly supportedProjectTypes = ['*'];

  private pipeline = new PipelineExecutor();
  private contextDetails: ContextDetails | null = null;
  private filePaths: string[] = [];

  /**
   * Execute the separator scan (pre-scan phase)
   */
  async execute(): Promise<ScanResult<SeparatorScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(10, 'Fetching context details...');
    this.log('info', `Starting separator scan for context: ${this.config.contextId}`);

    // Fetch context details
    const contextResult = await this.fetchContextDetails();
    if (!contextResult.success) {
      return this.errorResult(contextResult.error || 'Failed to fetch context details');
    }

    this.contextDetails = contextResult.data!;

    // Parse file paths
    this.filePaths = typeof this.contextDetails.file_paths === 'string'
      ? JSON.parse(this.contextDetails.file_paths)
      : this.contextDetails.file_paths || [];

    this.reportProgress(50, 'Pre-scan complete');

    return this.successResult({
      contextId: this.contextDetails.id,
      contextName: this.contextDetails.name,
      fileCount: this.filePaths.length,
      updatedAt: this.contextDetails.updated_at,
    });
  }

  /**
   * Execute the separation after user confirmation
   */
  async executeSeparation(): Promise<ScanResult<SeparatorScanData>> {
    if (!this.contextDetails) {
      return this.errorResult('Context details not available. Run execute() first.');
    }

    this.reportProgress(55, 'Building separation prompt...');

    // Build the prompt
    const promptContent = buildSeparatorPrompt({
      contextId: this.contextDetails.id,
      contextName: this.contextDetails.name,
      contextDescription: this.contextDetails.description || 'No description provided',
      filePaths: this.filePaths,
      projectPath: this.config.projectPath,
      fileCount: this.filePaths.length,
      updatedAt: this.contextDetails.updated_at,
    });

    this.reportProgress(60, 'Executing separation pipeline...');

    // Execute pipeline with polling
    const requirementName = `separator-${this.sanitizeName(this.contextDetails.name)}`;

    const pipelineResult = await this.pipeline.execute({
      projectPath: this.config.projectPath,
      projectId: this.config.projectId,
      requirementName,
      requirementContent: promptContent,
      executionMode: 'polling',
      onProgress: (progress, message) => {
        // Map pipeline progress (0-100) to our range (60-95)
        const mappedProgress = 60 + (progress * 0.35);
        this.reportProgress(mappedProgress, message);
      },
    });

    if (!pipelineResult.success) {
      this.log('error', `Separation failed: ${pipelineResult.error}`);
      return this.errorResult(pipelineResult.error || 'Pipeline execution failed');
    }

    // Create success event
    await this.createSeparationEvent(pipelineResult.taskId || '');

    this.reportProgress(100, 'Separation complete');
    this.log('info', 'Separator scan completed successfully');

    return this.successResult({
      contextId: this.contextDetails.id,
      contextName: this.contextDetails.name,
      fileCount: this.filePaths.length,
      updatedAt: this.contextDetails.updated_at,
      requirementPath: pipelineResult.requirementPath,
      taskId: pipelineResult.taskId,
    });
  }

  /**
   * Fetch context details from API
   */
  private async fetchContextDetails(): Promise<{
    success: boolean;
    data?: ContextDetails;
    error?: string;
  }> {
    const url = `/api/contexts/detail?contextId=${this.config.contextId}&projectId=${this.config.projectId}`;
    const result = await this.fetchJson<{ success: boolean; data: ContextDetails; error?: string }>(url);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data?.success) {
      return { success: false, error: result.data?.error || 'Failed to fetch context' };
    }

    return { success: true, data: result.data.data };
  }

  /**
   * Create success event
   */
  private async createSeparationEvent(taskId: string): Promise<void> {
    try {
      await this.postJson('/api/blueprint/events', {
        project_id: this.config.projectId,
        title: 'Separator Scan Completed',
        description: `Successfully separated context "${this.contextDetails?.name}" into smaller, focused contexts`,
        type: 'success',
        agent: 'blueprint',
        message: `Task ID: ${taskId}`,
      });
    } catch (error) {
      this.log('warn', 'Failed to create separation event');
    }
  }

  /**
   * Sanitize name for use in filenames
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<SeparatorScanData>): DecisionData<SeparatorScanData> | null {
    if (!result.success) {
      return {
        type: 'separator-scan-error',
        title: 'Separator Scan Failed',
        description: `An error occurred while analyzing the context:\n\n${result.error || 'Unknown error'}`,
        severity: 'error',
        contextId: this.config.contextId,
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    if (!result.data) {
      return null;
    }

    const { contextName, fileCount, updatedAt } = result.data;

    // Format date
    const lastUpdated = new Date(updatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Determine severity based on file count
    const severity: 'info' | 'warning' | 'error' =
      fileCount > 20 ? 'warning' :
      fileCount > 10 ? 'info' :
      'info';

    const description = `**Context**: ${contextName}
**Files**: ${fileCount}
**Last Updated**: ${lastUpdated}

${fileCount > 10
  ? `This context has **${fileCount} files**. Separating it into smaller, focused contexts (max 10 files each) will improve:

- Context clarity and maintainability
- AI understanding and accuracy
- Development velocity
- Team collaboration

`
  : `This context has **${fileCount} files**. While it's already small, separating it may help if files serve different purposes.

`}Click **Accept** to start the intelligent separation process using Claude Code.`;

    return {
      type: 'separator-pre-scan',
      title: 'Separate Context?',
      description,
      count: fileCount,
      severity,
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      contextId: this.config.contextId,
      data: result.data,
      onAccept: async () => {
        // Execute the separation
        const separationResult = await this.executeSeparation();
        if (!separationResult.success) {
          throw new Error(separationResult.error || 'Separation failed');
        }
      },
      onReject: async () => {
        this.log('info', 'User declined separation');
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
      errors.push('contextId is required for separator scan');
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

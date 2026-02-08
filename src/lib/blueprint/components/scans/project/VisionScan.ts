/**
 * Vision Scan Component
 * Generates high-level project documentation using Claude Code
 *
 * Migrated from:
 * src/app/features/Onboarding/blueprint/lib/blueprintVisionScan.ts
 *
 * Execution flow:
 * 1. Build requirement content via API (server-side prompt building)
 * 2. Execute pipeline with polling (wait for completion)
 * 3. Return decision with documentation path
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
 * Vision scan configuration
 */
export interface VisionScanConfig extends ScanConfig {
  outputPath?: string;  // Default: 'context/high.md'
}

/**
 * Vision scan result data
 */
export interface VisionScanData {
  documentPath: string;
  generatedAt: string;
  taskId?: string;
}

/**
 * Vision Scan Component
 * Generates high-level project documentation
 */
export class VisionScan extends BaseScan<VisionScanConfig, VisionScanData> {
  readonly id = 'scan.vision';
  readonly name = 'Vision Scan';
  readonly description = 'Generate high-level project documentation and architecture overview';
  readonly executionMode = 'polling' as const;
  readonly category = 'project' as const;
  readonly requiresContext = false;

  // Metadata
  readonly icon = 'Eye';
  readonly color = '#8b5cf6';  // Purple
  readonly tags = ['documentation', 'architecture', 'overview'];
  readonly supportedProjectTypes = ['*'];

  private pipeline = new PipelineExecutor();

  /**
   * Execute the vision scan
   */
  async execute(): Promise<ScanResult<VisionScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(5, 'Building vision requirement...');
    this.log('info', 'Starting vision scan');

    // Step 1: Build requirement content (server-side)
    const buildResult = await this.buildRequirement();
    if (!buildResult.success) {
      return this.errorResult(buildResult.error || 'Failed to build requirement');
    }

    this.reportProgress(15, 'Requirement content ready');

    // Step 2: Execute via pipeline with polling
    const pipelineResult = await this.pipeline.execute({
      projectPath: this.config.projectPath,
      projectId: this.config.projectId,
      requirementName: 'vision-scan',
      requirementContent: buildResult.content!,
      executionMode: 'polling',
      onProgress: (progress, message) => {
        // Map pipeline progress (0-100) to our range (15-100)
        const mappedProgress = 15 + (progress * 0.85);
        this.reportProgress(mappedProgress, message);
      },
    });

    if (!pipelineResult.success) {
      this.log('error', `Vision scan failed: ${pipelineResult.error}`);
      return this.errorResult(pipelineResult.error || 'Pipeline execution failed');
    }

    this.log('info', 'Vision scan completed successfully');

    return this.successResult(
      {
        documentPath: this.config.outputPath || 'context/high.md',
        generatedAt: pipelineResult.completedAt || new Date().toISOString(),
        taskId: pipelineResult.taskId,
      },
      {
        taskId: pipelineResult.taskId,
        requirementPath: pipelineResult.requirementPath,
      }
    );
  }

  /**
   * Build the requirement content via API
   */
  private async buildRequirement(): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    const result = await this.postJson<{ content: string }>(
      '/api/blueprint/vision-requirement',
      {
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
        projectName: this.config.projectName,
        projectType: this.config.projectType,
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, content: result.data?.content };
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<VisionScanData>): DecisionData<VisionScanData> | null {
    if (!result.success) {
      return {
        type: 'vision-scan-error',
        title: 'Vision Scan Failed',
        description: result.error || 'An unknown error occurred during the vision scan.',
        severity: 'error',
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
        onAccept: async () => {
          // Acknowledge error
        },
      };
    }

    return {
      type: 'vision-scan-complete',
      title: 'Vision Scan Complete',
      description: `High-level project documentation has been generated at ${result.data?.documentPath}. This includes architecture overview, key components, and project structure analysis.`,
      severity: 'info',
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      data: result.data,
      onAccept: async () => {
        // Could open the documentation file or navigate to it
        console.log('Vision scan accepted:', result.data?.documentPath);
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

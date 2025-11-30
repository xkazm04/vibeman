/**
 * Next.js Vision Scan Adapter
 * Generates high-level project documentation using Claude Code
 *
 * Note: While placed in nextjs folder, this adapter works with any project type
 * It's framework-agnostic and could be moved to a generic adapter folder in the future
 *
 * Uses centralized error handling for consistent error messages
 * and automatic retry logic for transient failures.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';
import { executePipeline } from '../../pipeline';

interface VisionScanData {
  taskId: string;
  requirementPath: string;
}

export class NextJSVisionAdapter extends BaseAdapter<VisionScanData> {
  public readonly id = 'nextjs-vision';
  public readonly name = 'Next.js Vision Scan';
  public readonly description = 'Generates high-level project documentation using Claude Code';
  public readonly supportedTypes = ['*']; // Framework-agnostic
  public readonly category = 'vision';
  public readonly priority = 100;

  /** Vision scans use Claude Code pipeline, longer timeout needed */
  protected override readonly retryConfig = {
    maxRetries: 1, // Pipeline operations are expensive, minimal retries
    initialDelayMs: 3000,
    maxDelayMs: 30000,
  };

  protected override readonly defaultTimeoutMs = 300000; // 5 minute timeout for vision scans

  /**
   * Execute vision scan using Claude Code pipeline
   */
  public async execute(context: ScanContext): Promise<ScanResult<VisionScanData>> {
    const { project } = context;

    // Use centralized error handling
    return this.executeWithErrorHandling(
      async () => {
        this.log('Building requirement with codebase context...');

        // Build requirement content via API (server-side)
        const buildResponse = await this.fetchApi<any>(
          '/api/blueprint/vision-requirement',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectName: project.name,
              projectPath: project.path,
              projectId: project.id,
            }),
          },
          { serviceName: 'Vision Requirement Builder' }
        );

        if (!buildResponse.success || !buildResponse.data?.success || !buildResponse.data?.requirementContent) {
          return this.createResult<VisionScanData>(
            false,
            undefined,
            buildResponse.error || buildResponse.data?.error || 'Failed to build requirement content'
          );
        }

        this.log('Starting Claude Code pipeline...');

        // Execute pipeline with progress tracking (wrapped in error handling)
        const result = await this.withErrorHandling(
          () => executePipeline({
            projectPath: project.path,
            projectId: project.id,
            requirementName: 'vision-scan',
            requirementContent: buildResponse.data.requirementContent,
            onProgress: (progress, message) => {
              // Update progress
              const { useBlueprintStore } = require('../../../store/blueprintStore');
              useBlueprintStore.getState().updateScanProgress(progress);
              this.log(`Progress: ${progress}% - ${message}`);
            },
          }),
          { operation: 'claude-code-pipeline' }
        );

        if (!result.success) {
          return this.createResult<VisionScanData>(
            false,
            undefined,
            result.error || 'Pipeline execution failed'
          );
        }

        this.log('Documentation generated successfully');

        return this.createResult(true, {
          taskId: result.taskId || '',
          requirementPath: result.requirementPath || '',
        });
      },
      { operation: 'vision-scan' }
    );
  }

  /**
   * Build decision data for vision scan completion
   */
  public buildDecision(result: ScanResult<VisionScanData>, project: Project): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { taskId } = result.data;

    return this.createDecision(
      {
        type: 'vision-scan',
        title: 'Vision Scan Completed',
        description: `✅ Claude Code has successfully generated high-level documentation for **${project.name}**.\n\n📄 **Output Location**: \`context/high.md\`\n\n🔍 **Task ID**: ${taskId}\n\nThe documentation includes:\n- Project overview and purpose\n- Architecture and tech stack\n- Key features and capabilities\n- Project structure\n- Development workflow\n- Design patterns\n\nClick **Accept** to acknowledge completion.`,
        count: 1,
        severity: 'info',
        data: { taskId },

        // Accept: Acknowledge completion
        onAccept: async () => {
          this.log('User acknowledged completion');
        },

        // Reject: Not applicable
        onReject: async () => {
          this.log('User dismissed notification');
        },
      },
      project
    );
  }
}

/**
 * Unused Code Scan Component
 * Detects unused components and exports using streaming analysis
 *
 * Migrated from:
 * src/app/features/Onboarding/sub_Blueprint/lib/blueprintUnusedScan.ts
 *
 * Execution flow:
 * 1. Call /api/unused-code with streaming enabled
 * 2. Process progress updates via streaming response
 * 3. Show selection UI for cleanup/integration actions
 * 4. Create requirements based on user selections
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { buildCleanupPrompt, UnusedFile } from '../../../prompts/templates/unusedCleanupPrompt';
import { buildIntegrationPrompt } from '../../../prompts/templates/unusedIntegrationPrompt';

/**
 * Unused scan configuration
 */
export interface UnusedScanConfig extends ScanConfig {
  projectType: string;
}

/**
 * Unused scan statistics
 */
export interface UnusedScanStats {
  totalFiles: number;
  totalExports: number;
  unusedExports: number;
}

/**
 * Unused scan result data
 */
export interface UnusedScanData {
  unusedFiles: UnusedFile[];
  stats?: UnusedScanStats;
}

/**
 * File selection actions
 */
export type FileAction = 'clean' | 'integrate' | 'skip';

/**
 * Unused Code Scan Component
 * Detects and analyzes unused components in the codebase
 */
export class UnusedScan extends BaseScan<UnusedScanConfig, UnusedScanData> {
  readonly id = 'scan.unused';
  readonly name = 'Unused Code Scan';
  readonly description = 'Detect unused components and exports in the codebase';
  readonly executionMode = 'streaming' as const;
  readonly category = 'project' as const;
  readonly requiresContext = false;

  // Metadata
  readonly icon = 'Trash2';
  readonly color = '#ef4444';  // Red
  readonly tags = ['project', 'analysis', 'cleanup', 'code-quality'];
  readonly supportedProjectTypes = ['nextjs'];

  private unusedFiles: UnusedFile[] = [];
  private stats: UnusedScanStats | undefined;

  /**
   * Execute the unused code scan with streaming
   */
  async execute(): Promise<ScanResult<UnusedScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(0, 'Starting unused code analysis...');
    this.log('info', `Starting unused scan for project: ${this.config.projectPath}`);

    try {
      const response = await fetch('/api/unused-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: this.config.projectPath,
          projectType: this.config.projectType,
          stream: true,
        }),
      });

      if (!response.body) {
        return this.errorResult('No response body received');
      }

      // Process streaming response
      const result = await this.processStreamingResponse(response.body);

      if (!result.success) {
        return this.errorResult(result.error || 'Scan failed');
      }

      this.unusedFiles = result.unusedFiles || [];
      this.stats = result.stats;

      this.reportProgress(100, 'Scan complete');
      this.log('info', `Found ${this.unusedFiles.length} unused files`);

      return this.successResult({
        unusedFiles: this.unusedFiles,
        stats: this.stats,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unused scan failed unexpectedly';
      this.log('error', errorMsg);
      return this.errorResult(errorMsg);
    }
  }

  /**
   * Process streaming response from unused code API
   */
  private async processStreamingResponse(body: ReadableStream<Uint8Array>): Promise<{
    success: boolean;
    unusedFiles?: UnusedFile[];
    stats?: UnusedScanStats;
    error?: string;
  }> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalResult: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const message = JSON.parse(line);

          if (message.type === 'progress') {
            this.reportProgress(message.progress, message.message || 'Analyzing...');
          } else if (message.type === 'complete') {
            finalResult = message.result;
          } else if (message.type === 'error') {
            return {
              success: false,
              error: message.error || 'Scan error',
            };
          }
        } catch {
          // Ignore parse errors for malformed messages
        }
      }
    }

    if (!finalResult) {
      return {
        success: false,
        error: 'No result received from scan',
      };
    }

    return {
      success: true,
      unusedFiles: finalResult.unusedFiles || [],
      stats: finalResult.stats,
    };
  }

  /**
   * Create requirements based on file selections
   */
  async createRequirements(
    fileSelections: Record<string, FileAction>
  ): Promise<{
    cleanupCreated: boolean;
    integrationCreated: boolean;
    cleanupPath?: string;
    integrationPath?: string;
    error?: string;
  }> {
    const cleanFiles = this.unusedFiles.filter((_, index) =>
      fileSelections[`file-${index}`] === 'clean'
    );
    const integrateFiles = this.unusedFiles.filter((_, index) =>
      fileSelections[`file-${index}`] === 'integrate'
    );

    let cleanupCreated = false;
    let integrationCreated = false;
    let cleanupPath: string | undefined;
    let integrationPath: string | undefined;

    try {
      // Create cleanup requirement if any files selected for deletion
      if (cleanFiles.length > 0) {
        const cleanupPrompt = buildCleanupPrompt({
          unusedFiles: cleanFiles,
          stats: this.stats,
        });

        const result = await this.postJson<{ success: boolean; filePath: string; error?: string }>(
          '/api/claude-code/requirement',
          {
            projectPath: this.config.projectPath,
            requirementName: `unused-cleanup-${Date.now()}`,
            content: cleanupPrompt,
            overwrite: false,
          }
        );

        if (result.success && result.data?.success) {
          cleanupCreated = true;
          cleanupPath = result.data.filePath;
          this.log('info', `Cleanup requirement created: ${cleanupPath}`);
        }
      }

      // Create integration requirement if any files selected for integration
      if (integrateFiles.length > 0) {
        const integrationPrompt = buildIntegrationPrompt({
          unusedFiles: integrateFiles,
          stats: this.stats,
        });

        const result = await this.postJson<{ success: boolean; filePath: string; error?: string }>(
          '/api/claude-code/requirement',
          {
            projectPath: this.config.projectPath,
            requirementName: `unused-integration-${Date.now()}`,
            content: integrationPrompt,
            overwrite: false,
          }
        );

        if (result.success && result.data?.success) {
          integrationCreated = true;
          integrationPath = result.data.filePath;
          this.log('info', `Integration requirement created: ${integrationPath}`);
        }
      }

      return {
        cleanupCreated,
        integrationCreated,
        cleanupPath,
        integrationPath,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create requirements';
      this.log('error', errorMsg);
      return {
        cleanupCreated,
        integrationCreated,
        cleanupPath,
        integrationPath,
        error: errorMsg,
      };
    }
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<UnusedScanData>): DecisionData<UnusedScanData> | null {
    if (!result.success) {
      return {
        type: 'unused-scan-error',
        title: 'Unused Code Scan Failed',
        description: `An error occurred:\n\n${result.error || 'Unknown error'}`,
        severity: 'error',
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    if (!result.data) {
      return null;
    }

    const { unusedFiles, stats } = result.data;

    // No unused files found
    if (unusedFiles.length === 0) {
      return {
        type: 'unused-scan-result',
        title: 'No Unused Code Found',
        description: 'All components and modules are being used.',
        count: 0,
        severity: 'info',
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
        data: result.data,
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    const description = `Select actions for each file. **${stats?.totalFiles || unusedFiles.length}** files analyzed, **${stats?.unusedExports || unusedFiles.length}** unused exports detected.`;

    return {
      type: 'unused-scan-selection',
      title: 'Select Actions for Unused Files',
      description,
      count: unusedFiles.length,
      severity: unusedFiles.length > 20 ? 'warning' : 'info',
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      data: result.data,
      // Custom content will be rendered by UI (UnusedFileDecision component)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customContent: { unusedFiles, stats } as any,
      onAccept: async () => {
        // Will be handled by custom UI that calls createRequirements()
      },
      onReject: async () => {
        this.log('info', 'User cancelled unused scan');
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

    if (!this.config.projectType) {
      errors.push('projectType is required');
    }

    if (this.config.projectType && !this.supportedProjectTypes.includes(this.config.projectType)) {
      errors.push(`Unsupported project type: ${this.config.projectType}. Only Next.js projects are supported.`);
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}

/**
 * Screen Coverage Scan Component
 * Finds contexts without test scenarios and generates coverage requirements in batch
 *
 * Migrated from:
 * src/app/features/Onboarding/sub_Blueprint/lib/blueprintScreenCoverage.ts
 *
 * Execution flow:
 * 1. Fetch all contexts for project (pre-scan)
 * 2. Filter contexts without test scenarios
 * 3. Show selection UI with batch selection
 * 4. Create requirements for selected contexts and queue them
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { buildScreenCoveragePrompt } from '../../../prompts/templates/screenCoveragePrompt';

/**
 * Screen coverage scan configuration
 */
export interface ScreenCoverageScanConfig extends ScanConfig {
  projectName: string;
  projectPort: number;
}

/**
 * Context without test scenario
 */
export interface UncoveredContext {
  id: string;
  name: string;
  description: string | null;
  filePaths: string[];
  groupName?: string;
}

/**
 * Screen coverage scan result data
 */
export interface ScreenCoverageScanData {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectPort: number;
  contexts: UncoveredContext[];
  contextCount: number;
}

/**
 * Screen coverage batch execution result
 */
export interface ScreenCoverageBatchResult {
  contextId: string;
  contextName: string;
  requirementName: string;
  requirementPath: string;
  taskId: string;
  success: boolean;
  error?: string;
}

/**
 * Screen Coverage Scan Component
 * Creates test scenario requirements for contexts without coverage
 */
export class ScreenCoverageScan extends BaseScan<ScreenCoverageScanConfig, ScreenCoverageScanData> {
  readonly id = 'scan.screen-coverage';
  readonly name = 'Screen Coverage Scan';
  readonly description = 'Find contexts without test scenarios and generate coverage requirements';
  readonly executionMode = 'direct' as const;  // Requirements created directly, no polling
  readonly category = 'batch' as const;
  readonly requiresContext = false;

  // Metadata
  readonly icon = 'Camera';
  readonly color = '#8b5cf6';  // Purple
  readonly tags = ['batch', 'testing', 'coverage', 'screenshots'];
  readonly supportedProjectTypes = ['*'];

  private uncoveredContexts: UncoveredContext[] = [];

  /**
   * Execute the screen coverage scan (pre-scan phase)
   */
  async execute(): Promise<ScanResult<ScreenCoverageScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(10, 'Fetching contexts...');
    this.log('info', `Starting screen coverage scan for project: ${this.config.projectId}`);

    // Fetch all contexts
    const contextsResult = await this.fetchAllContexts();
    if (!contextsResult.success) {
      return this.errorResult(contextsResult.error || 'Failed to fetch contexts');
    }

    this.reportProgress(50, 'Filtering uncovered contexts...');

    // Filter contexts without test scenarios
    const allContexts = contextsResult.data || [];
    this.uncoveredContexts = this.filterUncoveredContexts(allContexts);

    this.reportProgress(100, 'Pre-scan complete');
    this.log('info', `Found ${this.uncoveredContexts.length} contexts without test scenarios`);

    return this.successResult({
      projectId: this.config.projectId,
      projectName: this.config.projectName,
      projectPath: this.config.projectPath,
      projectPort: this.config.projectPort,
      contexts: this.uncoveredContexts,
      contextCount: this.uncoveredContexts.length,
    });
  }

  /**
   * Create requirements for selected contexts
   * Returns array of results with requirement paths and task IDs
   */
  async createRequirements(
    selectedContextIds: string[]
  ): Promise<ScreenCoverageBatchResult[]> {
    const results: ScreenCoverageBatchResult[] = [];

    // Filter to selected contexts
    const selectedContexts = this.uncoveredContexts.filter(
      (ctx) => selectedContextIds.includes(ctx.id)
    );

    this.reportProgress(0, `Creating ${selectedContexts.length} requirements...`);

    for (let i = 0; i < selectedContexts.length; i++) {
      const context = selectedContexts[i];
      const progress = ((i + 1) / selectedContexts.length) * 100;

      this.reportProgress(progress, `Creating requirement for ${context.name}...`);

      try {
        const result = await this.createSingleRequirement(context);
        results.push({
          contextId: context.id,
          contextName: context.name,
          requirementName: result.requirementName,
          requirementPath: result.requirementPath,
          taskId: `${this.config.projectId}:${result.requirementName}`,
          success: true,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.log('error', `Failed to create requirement for ${context.name}: ${errorMsg}`);
        results.push({
          contextId: context.id,
          contextName: context.name,
          requirementName: '',
          requirementPath: '',
          taskId: '',
          success: false,
          error: errorMsg,
        });
      }
    }

    // Create event
    const successCount = results.filter((r) => r.success).length;
    await this.createScreenCoverageEvent(successCount, results.filter((r) => r.success).map((r) => r.taskId));

    return results;
  }

  /**
   * Fetch all contexts for the project
   */
  private async fetchAllContexts(): Promise<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any[];
    error?: string;
  }> {
    const url = `/api/contexts?projectId=${this.config.projectId}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.fetchJson<{ success: boolean; data: { contexts: any[] }; error?: string }>(url);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data?.success || !result.data?.data) {
      return { success: false, error: 'Invalid API response' };
    }

    return { success: true, data: result.data.data.contexts || [] };
  }

  /**
   * Filter contexts that don't have test scenarios
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private filterUncoveredContexts(allContexts: any[]): UncoveredContext[] {
    return allContexts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((ctx: any) => !ctx.test_scenario || ctx.test_scenario.trim() === '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ctx: any) => {
        // Parse file paths
        let filePaths: string[] = [];
        try {
          if (Array.isArray(ctx.file_paths)) {
            filePaths = ctx.file_paths;
          } else if (ctx.file_paths && typeof ctx.file_paths === 'string' && ctx.file_paths !== 'undefined') {
            filePaths = JSON.parse(ctx.file_paths);
          }
        } catch {
          this.log('warn', `Failed to parse file_paths for context ${ctx.id}`);
        }

        return {
          id: ctx.id,
          name: ctx.name,
          description: ctx.description,
          filePaths,
          groupName: ctx.group_name || undefined,
        } as UncoveredContext;
      })
      .filter((ctx): ctx is UncoveredContext => ctx !== null);
  }

  /**
   * Create requirement for a single context
   */
  private async createSingleRequirement(
    context: UncoveredContext
  ): Promise<{ requirementName: string; requirementPath: string }> {
    // Build prompt
    const promptContent = buildScreenCoveragePrompt({
      projectId: this.config.projectId,
      projectName: this.config.projectName,
      projectPath: this.config.projectPath,
      projectPort: this.config.projectPort,
      contextId: context.id,
      contextName: context.name,
      contextDescription: context.description || 'No description provided',
      contextFilePaths: context.filePaths,
    });

    // Create safe filename
    const contextSlug = this.sanitizeName(context.name);
    const requirementName = `screen-coverage-${contextSlug}`;

    // Create requirement file
    const result = await this.postJson<{ success: boolean; filePath: string; error?: string }>(
      '/api/claude-code/requirement',
      {
        projectPath: this.config.projectPath,
        requirementName,
        content: promptContent,
        overwrite: true,
      }
    );

    if (!result.success || !result.data?.success) {
      throw new Error(result.data?.error || 'Failed to create requirement file');
    }

    return {
      requirementName,
      requirementPath: result.data.filePath,
    };
  }

  /**
   * Create success event
   */
  private async createScreenCoverageEvent(
    contextCount: number,
    taskIds: string[]
  ): Promise<void> {
    try {
      await this.postJson('/api/blueprint/events', {
        project_id: this.config.projectId,
        title: 'Screen Coverage Scan Completed',
        description: `Generated ${contextCount} screen coverage requirements for contexts without test scenarios`,
        type: 'success',
        agent: 'blueprint',
        message: `Task IDs: ${taskIds.join(', ')}`,
      });
    } catch (error) {
      this.log('warn', 'Failed to create screen coverage event');
    }
  }

  /**
   * Sanitize name for use in filenames
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Build decision data for UI
   * Note: This scan uses custom content, so the description is minimal
   */
  buildDecision(result: ScanResult<ScreenCoverageScanData>): DecisionData<ScreenCoverageScanData> | null {
    if (!result.success) {
      return {
        type: 'screen-coverage-error',
        title: 'Screen Coverage Scan Failed',
        description: `An error occurred while scanning for contexts:\n\n${result.error || 'Unknown error'}`,
        severity: 'error',
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    if (!result.data) {
      return null;
    }

    const { contexts, contextCount, projectName, projectPath } = result.data;

    // No contexts without test scenarios
    if (contextCount === 0) {
      return {
        type: 'screen-coverage-complete',
        title: 'All Contexts Have Test Scenarios',
        description: 'All contexts in this project already have test scenarios defined.\n\nNo screen coverage work needed.',
        severity: 'info',
        data: result.data,
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    const description = `**Project**: ${projectName}
**Path**: ${projectPath}
**Contexts Without Test Scenarios**: ${contextCount}

**What is Screen Coverage?**

This scan identifies contexts that don't have test scenarios and generates requirements to create them. Test scenarios enable automated screenshot capture for visual documentation.

**How it works:**
1. Select which contexts to cover (checkboxes below)
2. One Claude Code requirement per selected context
3. Claude analyzes UI components and navigation paths
4. Generates Playwright test scenarios
5. Saves scenarios to database for screenshot capture

**Select contexts below to generate coverage requirements.**`;

    return {
      type: 'screen-coverage-selection',
      title: 'Generate Screen Coverage Requirements?',
      description,
      count: contextCount,
      severity: 'info',
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      data: result.data,
      // Custom content will be rendered by the UI component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customContent: { contexts } as any,
      onAccept: async () => {
        // This will be handled by the custom UI component
        // which calls createRequirements() with selected contexts
      },
      onReject: async () => {
        this.log('info', 'User cancelled screen coverage scan');
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

    if (!this.config.projectName) {
      errors.push('projectName is required');
    }

    if (!this.config.projectPort) {
      errors.push('projectPort is required');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}

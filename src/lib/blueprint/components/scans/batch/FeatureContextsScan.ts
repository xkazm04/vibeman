/**
 * Feature Contexts Scan Component
 * Discovers feature folders and creates context requirements for each feature
 *
 * Migrated from:
 * src/app/features/Onboarding/blueprint/lib/blueprintContextsScan.ts
 * src/app/features/Onboarding/blueprint/lib/featureBasedContextsScan.ts
 *
 * Execution flow:
 * 1. Discover feature folders based on project type (pre-scan)
 * 2. Show feature list with batch selection
 * 3. Create requirements for each selected feature
 * 4. Add to TaskRunner batch for execution
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { buildFeatureContextsPrompt } from '../../../prompts/templates/featureContextsPrompt';

/**
 * Feature contexts scan configuration
 */
export interface FeatureContextsScanConfig extends ScanConfig {
  projectName: string;
  projectPort: number;
  projectType: string;
}

/**
 * Feature folder info
 */
export interface FeatureFolder {
  name: string;
  path: string;
  relativePath: string;
}

/**
 * Feature contexts scan result data
 */
export interface FeatureContextsScanData {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectType: string;
  featureFolders: string[];
  featureCount: number;
}

/**
 * Batch execution result for a single feature
 */
export interface FeatureBatchResult {
  featureName: string;
  requirementName: string;
  requirementPath: string;
  taskId: string;
  success: boolean;
  error?: string;
}

/**
 * Feature Contexts Scan Component
 * Creates context requirements for discovered feature folders
 */
export class FeatureContextsScan extends BaseScan<FeatureContextsScanConfig, FeatureContextsScanData> {
  readonly id = 'scan.feature-contexts';
  readonly name = 'Feature Contexts Scan';
  readonly description = 'Discover feature folders and create context requirements for each feature';
  readonly executionMode = 'direct' as const;
  readonly category = 'batch' as const;
  readonly requiresContext = false;

  // Metadata
  readonly icon = 'Folder';
  readonly color = '#f59e0b';  // Amber
  readonly tags = ['batch', 'contexts', 'discovery', 'features'];
  readonly supportedProjectTypes = ['nextjs', 'fastapi'];

  private featureFolders: string[] = [];

  /**
   * Execute the feature contexts scan (pre-scan phase)
   */
  async execute(): Promise<ScanResult<FeatureContextsScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(10, 'Discovering feature folders...');
    this.log('info', `Starting feature contexts scan for project: ${this.config.projectId}`);

    // Discover feature folders
    const discoverResult = await this.discoverFeatureFolders();
    if (!discoverResult.success) {
      return this.errorResult(discoverResult.error || 'Failed to discover feature folders');
    }

    this.featureFolders = discoverResult.data || [];

    if (this.featureFolders.length === 0) {
      const expectedPath = this.config.projectType === 'nextjs'
        ? 'src/app/features/'
        : 'routes/';
      return this.errorResult(`No feature folders found in project. Expected folders at: ${expectedPath}`);
    }

    this.reportProgress(100, 'Pre-scan complete');
    this.log('info', `Found ${this.featureFolders.length} feature folders`);

    return this.successResult({
      projectId: this.config.projectId,
      projectName: this.config.projectName,
      projectPath: this.config.projectPath,
      projectType: this.config.projectType,
      featureFolders: this.featureFolders,
      featureCount: this.featureFolders.length,
    });
  }

  /**
   * Create requirements for selected features
   */
  async createRequirements(selectedFeatures?: string[]): Promise<FeatureBatchResult[]> {
    const results: FeatureBatchResult[] = [];

    // Use all features if none selected
    const features = selectedFeatures && selectedFeatures.length > 0
      ? selectedFeatures
      : this.featureFolders;

    this.reportProgress(0, `Creating ${features.length} requirements...`);

    for (let i = 0; i < features.length; i++) {
      const featureName = features[i];
      const progress = ((i + 1) / features.length) * 100;

      this.reportProgress(progress, `Creating requirement for ${featureName}...`);

      try {
        const result = await this.createSingleRequirement(featureName);
        results.push({
          featureName,
          requirementName: result.requirementName,
          requirementPath: result.requirementPath,
          taskId: `${this.config.projectId}:${result.requirementName}`,
          success: true,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.log('error', `Failed to create requirement for ${featureName}: ${errorMsg}`);
        results.push({
          featureName,
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
    await this.createFeatureScanEvent(successCount, results.filter((r) => r.success).map((r) => r.taskId));

    return results;
  }

  /**
   * Discover feature folders based on project type
   */
  private async discoverFeatureFolders(): Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }> {
    try {
      let featureFoldersPath: string;

      if (this.config.projectType === 'nextjs') {
        featureFoldersPath = `${this.config.projectPath}/src/app/features`.replace(/\\/g, '/');
      } else if (this.config.projectType === 'fastapi') {
        featureFoldersPath = `${this.config.projectPath}/routes`.replace(/\\/g, '/');
      } else {
        return { success: false, error: `Unsupported project type: ${this.config.projectType}` };
      }

      this.log('debug', `Listing directories at: ${featureFoldersPath}`);

      // Use the list-directories API
      const result = await this.postJson<{
        success: boolean;
        directories: Array<{ name: string }>;
        error?: string;
      }>('/api/disk/search', {
        type: 'directories',
        path: featureFoldersPath,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'API call failed' };
      }

      if (!result.data?.success || !Array.isArray(result.data.directories)) {
        return { success: false, error: 'Invalid response from list-directories API' };
      }

      // Extract folder names
      const folders = result.data.directories.map((item) => item.name);
      this.log('debug', `Found folders: ${folders.join(', ')}`);

      return { success: true, data: folders };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create requirement for a single feature
   */
  private async createSingleRequirement(
    featureName: string
  ): Promise<{ requirementName: string; requirementPath: string }> {
    const featurePath = this.config.projectType === 'nextjs'
      ? `src/app/features/${featureName}`
      : `routes/${featureName}`;

    // Build prompt
    const promptContent = buildFeatureContextsPrompt({
      projectId: this.config.projectId,
      projectName: this.config.projectName,
      projectPath: this.config.projectPath,
      projectPort: this.config.projectPort,
      projectType: this.config.projectType,
      featureName,
      featurePath,
    });

    // Create safe filename
    const requirementName = `contexts-scan-${this.sanitizeName(featureName)}`;

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
   * Create event for feature scan queued
   */
  private async createFeatureScanEvent(
    featureCount: number,
    taskIds: string[]
  ): Promise<void> {
    try {
      await this.postJson('/api/blueprint/events', {
        project_id: this.config.projectId,
        title: 'Feature-Based Contexts Scan Queued',
        description: `${featureCount} feature scans have been queued for background execution. Each feature will be analyzed independently.`,
        type: 'info',
        agent: 'blueprint',
        message: `Task IDs: ${taskIds.join(', ')}`,
      });
    } catch (error) {
      this.log('warn', 'Failed to create feature scan event');
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
  buildDecision(result: ScanResult<FeatureContextsScanData>): DecisionData<FeatureContextsScanData> | null {
    if (!result.success) {
      return {
        type: 'feature-scan-error',
        title: 'Feature Scan Failed',
        description: `An error occurred while preparing the feature-based scan:\n\n${result.error || 'Unknown error'}`,
        severity: 'error',
        onAccept: async () => {},
        onReject: async () => {},
      };
    }

    if (!result.data) {
      return null;
    }

    const { featureFolders, featureCount, projectName, projectPath, projectType } = result.data;

    const featureList = featureFolders
      .slice(0, 10)
      .map((f, i) => `${i + 1}. ${f}`)
      .join('\n');

    const moreText = featureCount > 10 ? `\n... and ${featureCount - 10} more` : '';

    const description = `**Project**: ${projectName}
**Path**: ${projectPath}
**Project Type**: ${projectType}
**Features Discovered**: ${featureCount}

**Features to analyze:**
${featureList}${moreText}

**New Strategy: Feature-by-Feature Analysis**

Instead of analyzing the entire codebase at once, this scan will:
- **Create ${featureCount} separate Claude Code requirements** (one per feature)
- **Analyze each feature independently** with full context
- **Run in parallel** via TaskRunner for faster completion
- **Generate 1-3 contexts per feature** based on size and complexity
- **Include test scenarios** for UI features

**Why this works better:**
- Smaller, focused analysis = higher success rate
- Claude Code can deeply understand each feature
- Parallel execution = faster overall completion
- Better context quality and organization

**This will create ${featureCount} requirement files** and add them to your selected TaskRunner batch for execution.

Click **Select Batch & Start** to choose a batch and begin the scan.`;

    return {
      type: 'feature-scan-confirm',
      title: 'Generate Feature-Based Scan Requirements?',
      description,
      count: featureCount,
      severity: 'info',
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      data: result.data,
      // Custom content for batch selection will be provided by UI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customContent: { featureFolders, projectType } as any,
      onAccept: async () => {
        // Will be handled by custom UI
        const results = await this.createRequirements();
        if (results.some((r) => !r.success)) {
          const failed = results.filter((r) => !r.success);
          throw new Error(`Failed to create ${failed.length} requirements`);
        }
      },
      onReject: async () => {
        this.log('info', 'User cancelled feature contexts scan');
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

    if (!this.config.projectType) {
      errors.push('projectType is required');
    }

    if (this.config.projectType && !this.supportedProjectTypes.includes(this.config.projectType)) {
      errors.push(`Unsupported project type: ${this.config.projectType}. Supported: ${this.supportedProjectTypes.join(', ')}`);
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}

/**
 * Context Review Scan Component
 * Reviews a context to detect dead/new files and optionally split large contexts
 *
 * Migrated from:
 * src/app/features/Onboarding/sub_Blueprint/lib/context-scans/blueprintContextReviewScan.ts
 *
 * Execution flow:
 * 1. Fetch context details and untested implementation logs
 * 2. Show decision with context info
 * 3. Create requirement file and queue for execution (fire-and-forget)
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { createRequirementOnly } from '../../../pipeline/PipelineExecutor';

/**
 * Context review configuration
 */
export interface ContextReviewConfig extends ScanConfig {
  contextId: string;
  contextName?: string;
  batchId?: string;
  batchName?: string;
}

/**
 * Context details from API
 */
interface ContextDetails {
  id: string;
  name: string;
  description: string;
  files: string[];
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Implementation log entry
 */
interface ImplementationLog {
  id: string;
  title: string;
  description: string;
  files: string[];
  createdAt: string;
}

/**
 * Context review result data
 */
export interface ContextReviewData {
  context: ContextDetails;
  untestedLogs: ImplementationLog[];
  requirementPath?: string;
  taskId?: string;
}

/**
 * Context Review Scan Component
 * Reviews and updates context file lists
 */
export class ContextReviewScan extends BaseScan<ContextReviewConfig, ContextReviewData> {
  readonly id = 'scan.context-review';
  readonly name = 'Context Review';
  readonly description = 'Review context files, detect dead files, and discover new related files';
  readonly executionMode = 'fire-and-forget' as const;
  readonly category = 'context' as const;
  readonly requiresContext = true;

  // Metadata
  readonly icon = 'FileSearch';
  readonly color = '#06b6d4';  // Cyan
  readonly tags = ['context', 'files', 'review', 'maintenance'];
  readonly supportedProjectTypes = ['*'];

  private contextDetails: ContextDetails | null = null;
  private untestedLogs: ImplementationLog[] = [];

  /**
   * Execute the context review scan
   */
  async execute(): Promise<ScanResult<ContextReviewData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(10, 'Fetching context details...');
    this.log('info', `Starting context review for: ${this.config.contextId}`);

    // Step 1: Fetch context details
    const contextResult = await this.fetchContextDetails();
    if (!contextResult.success) {
      return this.errorResult(contextResult.error || 'Failed to fetch context details');
    }
    this.contextDetails = contextResult.data!;

    this.reportProgress(30, 'Fetching implementation history...');

    // Step 2: Fetch untested implementation logs
    const logsResult = await this.fetchUntestedLogs();
    if (!logsResult.success) {
      // Non-fatal, continue without logs
      this.log('warn', 'Could not fetch untested logs');
    } else {
      this.untestedLogs = logsResult.data || [];
    }

    this.reportProgress(50, 'Pre-scan complete');

    // Return pre-scan data (execution happens after user decision)
    return this.successResult({
      context: this.contextDetails,
      untestedLogs: this.untestedLogs,
    });
  }

  /**
   * Execute the review after user confirmation
   * This is called when the user accepts the decision
   */
  async executeReview(): Promise<ScanResult<ContextReviewData>> {
    if (!this.contextDetails) {
      return this.errorResult('Context details not available. Run execute() first.');
    }

    this.reportProgress(60, 'Building requirement...');

    // Build the prompt
    const promptContent = this.buildPrompt();

    this.reportProgress(70, 'Creating requirement file...');

    // Create requirement file
    const requirementName = `context-review-${this.sanitizeName(this.contextDetails.name)}`;
    const createResult = await createRequirementOnly(
      this.config.projectPath,
      requirementName,
      promptContent
    );

    if (!createResult.success) {
      return this.errorResult(createResult.error || 'Failed to create requirement');
    }

    this.reportProgress(80, 'Queueing for execution...');

    // Queue for TaskRunner execution
    const taskId = await this.queueForExecution(requirementName);

    this.reportProgress(100, 'Review queued');
    this.log('info', 'Context review requirement created and queued');

    return this.successResult({
      context: this.contextDetails,
      untestedLogs: this.untestedLogs,
      requirementPath: createResult.path,
      taskId,
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
    const result = await this.fetchJson<ContextDetails>(
      `/api/contexts/detail?contextId=${this.config.contextId}&projectId=${this.config.projectId}`
    );

    return result;
  }

  /**
   * Fetch untested implementation logs
   */
  private async fetchUntestedLogs(): Promise<{
    success: boolean;
    data?: ImplementationLog[];
    error?: string;
  }> {
    const result = await this.fetchJson<ImplementationLog[]>(
      `/api/implementation-logs/untested?contextId=${this.config.contextId}`
    );

    return result;
  }

  /**
   * Build the context review prompt
   */
  private buildPrompt(): string {
    const context = this.contextDetails!;
    const logs = this.untestedLogs;

    const filesSection = context.files.length > 0
      ? context.files.map(f => `- ${f}`).join('\n')
      : 'No files currently in context';

    const logsSection = logs.length > 0
      ? logs.map(log => `
### ${log.title}
${log.description}
Files: ${log.files.join(', ')}
Date: ${log.createdAt}
`).join('\n')
      : 'No recent implementation changes';

    return `# Context Review: ${context.name}

## Objective
Review the context "${context.name}" to ensure file list accuracy and discover any new related files.

## Context Information
- **ID**: ${context.id}
- **Name**: ${context.name}
- **Description**: ${context.description}
- **Current File Count**: ${context.fileCount}
- **Last Updated**: ${context.updatedAt}

## Current Files in Context
${filesSection}

## Recent Implementation Changes (Untested)
${logsSection}

## Instructions

### Step 1: Verify Existing Files
For each file in the current context:
1. Check if the file still exists on disk
2. If a file doesn't exist, mark it as "dead" for removal

### Step 2: Discover New Related Files
Based on the context description and recent changes:
1. Search for new files that logically belong to this context
2. Look for imports/dependencies of existing files
3. Check for test files related to the context

### Step 3: Update Context
Make API calls to update the context:

**Remove dead files:**
\`\`\`
PUT /api/contexts/${context.id}
{
  "files": [...remaining valid files]
}
\`\`\`

**Add new discovered files:**
Include new files in the updated files array.

### Step 4: Report
Summarize:
- Number of dead files removed
- Number of new files added
- Any recommendations for context reorganization

## Success Criteria
- All file paths verified
- Dead files removed from context
- New related files added
- Context file list is accurate and up-to-date
`;
  }

  /**
   * Queue the requirement for TaskRunner execution
   */
  private async queueForExecution(requirementName: string): Promise<string> {
    const taskId = `${this.config.projectId}:${requirementName}`;

    // This would integrate with TaskRunner store
    // For now, just return the taskId
    // In backward compat layer, this will be wired to actual TaskRunner

    return taskId;
  }

  /**
   * Sanitize name for use in filenames
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<ContextReviewData>): DecisionData<ContextReviewData> | null {
    if (!result.success) {
      return {
        type: 'context-review-error',
        title: 'Context Review Failed',
        description: result.error || 'Failed to prepare context review',
        severity: 'error',
        contextId: this.config.contextId,
        onAccept: async () => {},
      };
    }

    const context = result.data!.context;
    const untestedCount = result.data!.untestedLogs.length;

    // Determine severity based on context size and untested changes
    let severity: 'info' | 'warning' | 'error' = 'info';
    if (context.fileCount > 20 || untestedCount > 5) {
      severity = 'warning';
    }
    if (context.fileCount > 50 || untestedCount > 10) {
      severity = 'error';
    }

    return {
      type: 'context-review-ready',
      title: `Review Context: ${context.name}`,
      description: `Context has ${context.fileCount} files${untestedCount > 0 ? ` and ${untestedCount} untested changes` : ''}. Review will verify file existence and discover new related files.`,
      severity,
      contextId: this.config.contextId,
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      count: context.fileCount,
      data: result.data,
      onAccept: async () => {
        // Execute the actual review
        await this.executeReview();
      },
      onReject: async () => {
        this.log('info', 'Context review rejected by user');
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
      errors.push('contextId is required for context review');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}

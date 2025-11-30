/**
 * Blueprint Context Review Scan
 * Reviews a context to detect dead files, new files, and optionally split into smaller contexts
 * Also provides untested implementation logs for better context awareness
 */

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintStore } from '../../store/blueprintStore';
import { contextReviewPrompt } from './prompts/contextReview';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import type { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { isBatchRunning } from '@/app/features/TaskRunner/lib/types';
import { toast } from 'sonner';
import FeatureScanBatchSelector from '../../components/FeatureScanBatchSelector';
import {
  type ScanResult,
  type DecisionData,
  PROGRESS,
  FILE_THRESHOLDS,
  UNTESTED_LOGS_THRESHOLDS,
  DEFAULT_PROJECT_PORT,
  fetchContextDetails,
  fetchUntestedLogs,
  parseFilePaths,
  formatDateSafe,
  createBlueprintEvent,
  createRequirementFile,
  buildTaskId,
  sanitizeRequirementName,
} from './scanUtils';

// Re-export types for consumers
export type { ScanResult, DecisionData };

/**
 * Execute context review scan - Pre-scan phase
 * Fetches context data, untested logs, and shows decision panel
 */
export async function executeContextReviewScan(contextId: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  try {
    // Update progress
    useBlueprintStore.getState().updateScanProgress(PROGRESS.INITIAL);

    // Fetch context details
    console.log('[Context Review] Fetching context details for:', contextId, 'project:', activeProject.id);
    const context = await fetchContextDetails(contextId, activeProject.id);
    console.log('[Context Review] Context fetched:', context);

    useBlueprintStore.getState().updateScanProgress(PROGRESS.CONTEXT_FETCHED);

    if (!context) {
      console.error('[Context Review] Context not found');
      return {
        success: false,
        error: 'Context not found',
      };
    }

    // Get file paths using shared utility
    const filePaths = parseFilePaths(context);
    console.log('[Context Review] FilePaths:', filePaths, 'Length:', filePaths.length);

    useBlueprintStore.getState().updateScanProgress(PROGRESS.FILE_PATHS_PARSED);

    // Fetch untested implementation logs
    const untestedLogs = await fetchUntestedLogs(contextId);
    console.log('[Context Review] Fetched untested logs:', untestedLogs.length, 'logs');

    useBlueprintStore.getState().updateScanProgress(PROGRESS.LOGS_FETCHED);

    // Format date (updatedAt is already a Date object from API)
    const updatedAtStr = context.updatedAt
      ? (context.updatedAt instanceof Date ? context.updatedAt.toISOString() : String(context.updatedAt))
      : new Date().toISOString();

    // Return context info for pre-scan decision
    const result = {
      success: true,
      data: {
        contextId: context.id,
        contextName: context.name,
        fileCount: filePaths.length,
        updatedAt: updatedAtStr,
        untestedLogsCount: untestedLogs.length,
      },
    };
    console.log('[Context Review] Returning result:', result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch context details';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Create requirement file for context review (without executing)
 */
async function createContextReviewRequirement(
  contextId: string,
  context: { name: string; description?: string; updatedAt?: Date | string; filePaths?: string[] },
  projectPath: string
): Promise<{ requirementName: string; requirementPath: string }> {
  // Get file paths using shared utility
  const filePaths = parseFilePaths(context);

  // Fetch untested implementation logs
  const untestedLogs = await fetchUntestedLogs(contextId);

  // Format date for prompt
  const updatedAtStr = context.updatedAt
    ? (context.updatedAt instanceof Date ? context.updatedAt.toISOString() : String(context.updatedAt))
    : new Date().toISOString();

  // Get active project to access port
  const { activeProject } = useActiveProjectStore.getState();
  const projectPort = activeProject?.port || DEFAULT_PROJECT_PORT;

  // Build context review prompt
  const promptContent = contextReviewPrompt({
    contextId,
    contextName: context.name,
    contextDescription: context.description || 'No description provided',
    filePaths,
    projectPath,
    projectPort,
    fileCount: filePaths.length,
    updatedAt: updatedAtStr,
    untestedLogs: Array.isArray(untestedLogs) ? untestedLogs : [],
  });

  const requirementName = sanitizeRequirementName(context.name, 'context-review');

  // Use shared utility to create requirement file
  return createRequirementFile(projectPath, requirementName, promptContent);
}

/**
 * Create event for context review task queued
 */
async function createContextReviewEvent(
  projectId: string,
  contextName: string,
  taskId: string
): Promise<void> {
  await createBlueprintEvent(
    projectId,
    'Context Review Queued',
    `Context review for "${contextName}" has been added to background task queue. Check the TaskRunner or bottom task bar for progress.`,
    'info',
    `Task ID: ${taskId}`
  );
}

/**
 * Execute context review with selected batch
 */
async function executeContextReview(
  contextId: string,
  contextName: string,
  projectId: string,
  projectPath: string,
  batchId: BatchId
): Promise<void> {
  try {
    // Fetch full context details
    const context = await fetchContextDetails(contextId, projectId);

    // Create requirement file
    const { requirementName, requirementPath } = await createContextReviewRequirement(
      contextId,
      context,
      projectPath
    );

    console.log('[Context Review] Requirement created:', { requirementName, requirementPath });

    // Add to TaskRunner for background execution
    const taskRunnerStore = useTaskRunnerStore.getState();

    // Build task ID using shared utility
    const taskId = buildTaskId(projectId, requirementName);

    // Ensure batch exists
    let batch = taskRunnerStore.batches[batchId];
    if (!batch) {
      taskRunnerStore.createBatch(batchId, 'Context Reviews', []);
      // Re-fetch batch after creation
      batch = useTaskRunnerStore.getState().batches[batchId];
    }

    // Add task to batch
    taskRunnerStore.addTaskToBatch(batchId, taskId);
    console.log(`[Context Review] Added task to ${batchId}:`, taskId);

    // Re-fetch current batch state before starting
    batch = useTaskRunnerStore.getState().batches[batchId];
    if (batch && !isBatchRunning(batch.status)) {
      taskRunnerStore.startBatch(batchId);
      console.log('[Context Review] Started batch:', batchId);
    }

    // Create event for task queued
    await createContextReviewEvent(projectId, contextName, taskId);

    console.log('[Context Review] Task added to background queue', {
      requirementName,
      requirementPath,
      batchId,
      taskId,
    });

    // Show success toast
    toast.success(`Context review queued in ${batchId}`, {
      description: `"${contextName}" will be reviewed. Check TaskRunner for progress.`,
    });
  } catch (error) {
    console.error('[Context Review] Failed to queue task:', error);
    toast.error('Failed to queue context review', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Build pre-scan decision data
 * Shows context info and asks user to confirm review
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  console.log('[Context Review] buildDecisionData called with result:', result);
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[Context Review] No active project');
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'context-review-error',
      title: 'Context Review Failed',
      description: `An error occurred while analyzing the context:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
      severity: 'error',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { error: result.error },
      onAccept: async () => {
        // Error acknowledged
      },
      onReject: async () => {
        // Error dismissed
      },
    };
  }

  if (!result.data) {
    console.error('[Context Review] result.data is missing');
    return null;
  }

  console.log('[Context Review] result.data:', result.data);

  // Extract data with type safety
  const contextId = result.data.contextId as string;
  const contextName = result.data.contextName as string;
  const fileCount = result.data.fileCount as number;
  const updatedAt = result.data.updatedAt as string;
  const untestedLogsCount = result.data.untestedLogsCount as number;

  console.log('[Context Review] Destructured values:', { contextId, contextName, fileCount, updatedAt, untestedLogsCount });

  // Format date using shared utility
  const lastUpdated = formatDateSafe(updatedAt);
  console.log('[Context Review] Formatted lastUpdated:', lastUpdated);

  // Determine severity based on file count and untested logs
  const hasLargeFileCount = fileCount > FILE_THRESHOLDS.LARGE;
  const hasMediumFileCount = fileCount > FILE_THRESHOLDS.MEDIUM;
  const hasHighUntestedLogs = untestedLogsCount > UNTESTED_LOGS_THRESHOLDS.HIGH;
  const hasUntestedLogs = untestedLogsCount > 0;

  const severity: 'info' | 'warning' | 'error' =
    hasLargeFileCount || hasHighUntestedLogs ? 'warning' :
    hasMediumFileCount || hasUntestedLogs ? 'info' :
    'info';

  const description = `📦 **Context**: ${contextName}
📄 **Files**: ${fileCount}
📅 **Last Updated**: ${lastUpdated}
${untestedLogsCount > 0 ? `🔬 **Untested Changes**: ${untestedLogsCount} implementation logs` : ''}

The review will:
✅ **Primary**: Check for dead/removed files and detect new files that should be included
${hasUntestedLogs ? '✅ Analyze recent untested implementation changes\n' : ''}${hasMediumFileCount
  ? `✅ **Secondary**: Optionally split into smaller contexts (current: ${fileCount} files, recommended: max ${FILE_THRESHOLDS.MEDIUM} per context)\n`
  : ''
}
Click **Select Batch & Start** to choose a batch and start the intelligent review process.`;

  // Create custom content with batch selection
  const customContent = React.createElement(FeatureScanBatchSelector, {
    description,
    onStart: async (batchId: BatchId) => {
      await executeContextReview(
        contextId,
        contextName,
        activeProject.id,
        activeProject.path,
        batchId
      );

      // Accept decision after successful execution
      const { useDecisionQueueStore } = await import('@/stores/decisionQueueStore');
      useDecisionQueueStore.getState().acceptDecision();
    },
    onCancel: async () => {
      console.log('[Context Review] User cancelled review');
      const { useDecisionQueueStore } = await import('@/stores/decisionQueueStore');
      useDecisionQueueStore.getState().rejectDecision();
    },
  });

  return {
    type: 'context-review-pre-scan',
    title: 'Review Context?',
    description,
    count: fileCount,
    severity,
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
    data: result.data,
    customContent,

    // Fallback handlers (not used when customContent is present)
    onAccept: async () => {},
    onReject: async () => {},
  };
}

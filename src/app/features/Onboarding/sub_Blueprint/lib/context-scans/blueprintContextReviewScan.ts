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
import { toast } from 'sonner';
import FeatureScanBatchSelector from '../../components/FeatureScanBatchSelector';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: Record<string, unknown>;
  customContent?: React.ReactNode;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Fetch context details from database
 */
async function fetchContextDetails(contextId: string, projectId: string) {
  const response = await fetch(`/api/contexts/detail?contextId=${contextId}&projectId=${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch context details: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch context details');
  }

  return result.data;
}

/**
 * Fetch untested implementation logs for a context
 */
async function fetchUntestedLogs(contextId: string) {
  const response = await fetch(`/api/implementation-logs/untested?contextId=${contextId}`);

  if (!response.ok) {
    console.warn('Failed to fetch untested logs, continuing without them');
    return [];
  }

  const result = await response.json();
  return result.success ? result.data : [];
}

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
    useBlueprintStore.getState().updateScanProgress(10);

    // Fetch context details
    console.log('[Context Review] Fetching context details for:', contextId, 'project:', activeProject.id);
    const context = await fetchContextDetails(contextId, activeProject.id);
    console.log('[Context Review] Context fetched:', context);

    useBlueprintStore.getState().updateScanProgress(30);

    if (!context) {
      console.error('[Context Review] Context not found');
      return {
        success: false,
        error: 'Context not found',
      };
    }

    // Get file paths (API returns filePaths in camelCase, already parsed)
    const filePaths = Array.isArray(context.filePaths) ? context.filePaths : [];
    console.log('[Context Review] FilePaths:', filePaths, 'Length:', filePaths.length);

    useBlueprintStore.getState().updateScanProgress(50);

    // Fetch untested implementation logs
    const untestedLogs = await fetchUntestedLogs(contextId);
    console.log('[Context Review] Fetched untested logs:', untestedLogs.length, 'logs');

    useBlueprintStore.getState().updateScanProgress(70);

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
  context: any,
  projectPath: string
): Promise<{ requirementName: string; requirementPath: string }> {
  // Get file paths (API returns filePaths in camelCase, already parsed)
  const filePaths = Array.isArray(context.filePaths) ? context.filePaths : [];

  // Fetch untested implementation logs
  const untestedLogs = await fetchUntestedLogs(contextId);

  // Format date for prompt
  const updatedAtStr = context.updatedAt
    ? (context.updatedAt instanceof Date ? context.updatedAt.toISOString() : String(context.updatedAt))
    : new Date().toISOString();

  // Get active project to access port
  const { activeProject } = useActiveProjectStore.getState();
  const projectPort = activeProject?.port || 3000; // Default to 3000 if not found

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

  const requirementName = `context-review-${context.name.toLowerCase().replace(/\s+/g, '-')}`;

  // Create requirement file only (don't execute yet)
  const response = await fetch('/api/claude-code/requirement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      requirementName,
      content: promptContent,
      overwrite: true,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create requirement file');
  }

  return {
    requirementName,
    requirementPath: result.filePath,
  };
}

/**
 * Create event for context review task queued
 */
async function createContextReviewEvent(
  projectId: string,
  contextName: string,
  taskId: string
): Promise<void> {
  await fetch('/api/blueprint/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      title: 'Context Review Queued',
      description: `Context review for "${contextName}" has been added to background task queue. Check the TaskRunner or bottom task bar for progress.`,
      type: 'info',
      agent: 'blueprint',
      message: `Task ID: ${taskId}`,
    }),
  });
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

    // Build task ID (format: projectId:requirementName)
    const taskId = `${projectId}:${requirementName}`;

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
    if (batch?.status !== 'running') {
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

  // Format date with safety check
  let lastUpdated = 'Unknown';
  try {
    if (updatedAt) {
      const date = new Date(updatedAt);
      if (!isNaN(date.getTime())) {
        lastUpdated = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } else {
        console.warn('[Context Review] Invalid date:', updatedAt);
      }
    } else {
      console.warn('[Context Review] updatedAt is missing');
    }
  } catch (e) {
    console.error('[Context Review] Date parsing error:', e);
  }
  console.log('[Context Review] Formatted lastUpdated:', lastUpdated);

  // Determine severity based on file count and untested logs
  const severity: 'info' | 'warning' | 'error' =
    fileCount > 20 || untestedLogsCount > 5 ? 'warning' :
    fileCount > 10 || untestedLogsCount > 0 ? 'info' :
    'info';

  const description = `📦 **Context**: ${contextName}
📄 **Files**: ${fileCount}
📅 **Last Updated**: ${lastUpdated}
${untestedLogsCount > 0 ? `🔬 **Untested Changes**: ${untestedLogsCount} implementation logs` : ''}

The review will:
✅ **Primary**: Check for dead/removed files and detect new files that should be included
${untestedLogsCount > 0 ? '✅ Analyze recent untested implementation changes\n' : ''}${fileCount > 10
  ? `✅ **Secondary**: Optionally split into smaller contexts (current: ${fileCount} files, recommended: max 10 per context)\n`
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

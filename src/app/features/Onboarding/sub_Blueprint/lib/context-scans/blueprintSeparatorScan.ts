/**
 * Blueprint Separator Scan
 * Analyzes a context and intelligently separates it into smaller, more focused contexts (max 10 files each)
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintStore } from '../../store/blueprintStore';
import { executePipeline } from '../pipeline';
import { separatorPrompt } from './prompts/separator';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    contextId: string;
    contextName: string;
    fileCount: number;
    updatedAt: string;
    requirementPath?: string;
    taskId?: string;
  };
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
  data?: any;
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
 * Execute separator scan - Pre-scan phase
 * Fetches context data and shows decision panel with context info
 */
export async function executeSeparatorScan(contextId: string): Promise<ScanResult> {
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
    const context = await fetchContextDetails(contextId, activeProject.id);

    useBlueprintStore.getState().updateScanProgress(30);

    if (!context) {
      return {
        success: false,
        error: 'Context not found',
      };
    }

    // Parse file paths
    const filePaths = typeof context.file_paths === 'string'
      ? JSON.parse(context.file_paths)
      : context.file_paths;

    useBlueprintStore.getState().updateScanProgress(50);

    // Return context info for pre-scan decision
    return {
      success: true,
      data: {
        contextId: context.id,
        contextName: context.name,
        fileCount: filePaths.length,
        updatedAt: context.updated_at,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch context details';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Execute separation process using Claude Code pipeline
 */
async function executeSeparation(
  contextId: string,
  context: any,
  projectId: string,
  projectPath: string
): Promise<{ requirementPath: string; taskId: string }> {
  // Parse file paths
  const filePaths = typeof context.file_paths === 'string'
    ? JSON.parse(context.file_paths)
    : context.file_paths;

  // Build separation prompt
  const promptContent = separatorPrompt({
    contextId,
    contextName: context.name,
    contextDescription: context.description || 'No description provided',
    filePaths,
    projectPath,
    fileCount: filePaths.length,
    updatedAt: context.updated_at,
  });

  // Execute pipeline with progress tracking
  const result = await executePipeline({
    projectPath,
    projectId,
    requirementName: `separator-${context.name.toLowerCase().replace(/\s+/g, '-')}`,
    requirementContent: promptContent,
    onProgress: (progress, message) => {
      useBlueprintStore.getState().updateScanProgress(progress);
      console.log(`[Separator Scan] ${progress}%: ${message}`);
    },
  });

  if (!result.success) {
    throw new Error(result.error || 'Pipeline execution failed');
  }

  return {
    requirementPath: result.requirementPath || '',
    taskId: result.taskId || '',
  };
}

/**
 * Create event for successful separation
 */
async function createSeparationEvent(
  projectId: string,
  contextName: string,
  taskId: string
): Promise<void> {
  await fetch('/api/blueprint/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      title: 'Separator Scan Completed',
      description: `Successfully separated context "${contextName}" into smaller, focused contexts`,
      type: 'success',
      agent: 'blueprint',
      message: `Task ID: ${taskId}`,
    }),
  });
}

/**
 * Build pre-scan decision data
 * Shows context info and asks user to confirm separation
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'separator-scan-error',
      title: 'Separator Scan Failed',
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
    return null;
  }

  const { contextId, contextName, fileCount, updatedAt } = result.data;

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

  const description = `📦 **Context**: ${contextName}
📄 **Files**: ${fileCount}
📅 **Last Updated**: ${lastUpdated}

${fileCount > 10
  ? `⚠️ This context has **${fileCount} files**. Separating it into smaller, focused contexts (max 10 files each) will improve:\n\n✅ Context clarity and maintainability\n✅ AI understanding and accuracy\n✅ Development velocity\n✅ Team collaboration\n\n`
  : `ℹ️ This context has **${fileCount} files**. While it's already small, separating it may help if files serve different purposes.\n\n`
}Click **Accept** to start the intelligent separation process using Claude Code.`;

  return {
    type: 'separator-pre-scan',
    title: 'Separate Context?',
    description,
    count: fileCount,
    severity,
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
    data: result.data,

    // Accept: Execute separation via Claude Code pipeline
    onAccept: async () => {
      try {
        // Fetch full context details again for separation
        const context = await fetchContextDetails(contextId, activeProject.id);

        // Execute separation pipeline
        const { requirementPath, taskId } = await executeSeparation(
          contextId,
          context,
          activeProject.id,
          activeProject.path
        );

        // Create success event
        await createSeparationEvent(activeProject.id, contextName, taskId);

        console.log('[Separator Scan] Separation completed successfully', {
          requirementPath,
          taskId,
        });
      } catch (error) {
        console.error('[Separator Scan] Separation failed:', error);
        throw error;
      }
    },

    // Reject: Close decision panel (default behavior)
    onReject: async () => {
      console.log('[Separator Scan] User declined separation');
    },
  };
}

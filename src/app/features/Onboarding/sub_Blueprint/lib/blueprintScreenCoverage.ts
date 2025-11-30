/**
 * Blueprint Screen Coverage Scan
 * Finds contexts without test scenarios and generates coverage requirements
 */

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintStore } from '../store/blueprintStore';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { isBatchRunning } from '@/app/features/TaskRunner/lib/types';
import { toast } from 'sonner';
import ScreenCoverageWithBatchSelection from '../components/ScreenCoverageWithBatchSelection';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    projectId: string;
    projectName: string;
    projectPath: string;
    projectPort: number;
    contexts: Array<{
      id: string;
      name: string;
      description: string | null;
      filePaths: string[];
      groupName?: string;
    }>;
    contextCount: number;
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
  customContent?: React.ReactNode;
  data?: any;
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>;
}

/**
 * Pre-scan: Find all contexts without test scenarios
 */
export async function executeScreenCoverageScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  try {
    useBlueprintStore.getState().updateScanProgress(25);

    // Fetch all contexts for the project via API
    const response = await fetch(`/api/contexts?projectId=${activeProject.id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch contexts from API');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid API response');
    }

    useBlueprintStore.getState().updateScanProgress(50);

    const allContexts = result.data.contexts || [];

    console.log('[Screen Coverage] API returned contexts:', allContexts.length);
    if (allContexts.length > 0) {
      console.log('[Screen Coverage] First context sample:', allContexts[0]);
    }

    // Filter contexts without test scenarios
    const contextsWithoutScenarios = allContexts.filter(
      (ctx: any) => !ctx.test_scenario || ctx.test_scenario.trim() === ''
    );

    console.log('[Screen Coverage] Contexts without scenarios:', contextsWithoutScenarios.length);

    useBlueprintStore.getState().updateScanProgress(100);

    interface ScreenCoverageContext {
      id: string;
      name: string;
      description: string | null;
      filePaths: string[];
      groupName?: string;
    }

    // Parse file paths (stored as JSON string)
    const contexts = contextsWithoutScenarios
      .map((ctx: any): ScreenCoverageContext | null => {
        try {
          // Safely parse file_paths
          let filePaths: string[] = [];

          console.log(`[Screen Coverage] Context ${ctx.id} file_paths:`, {
            type: typeof ctx.file_paths,
            value: ctx.file_paths,
            isArray: Array.isArray(ctx.file_paths),
          });

          if (Array.isArray(ctx.file_paths)) {
            // Already an array
            filePaths = ctx.file_paths;
          } else if (ctx.file_paths && typeof ctx.file_paths === 'string' && ctx.file_paths !== 'undefined') {
            // Valid JSON string
            filePaths = JSON.parse(ctx.file_paths);
          } else {
            // Invalid or missing, use empty array
            console.warn(`[Screen Coverage] Context ${ctx.id} has invalid file_paths, using empty array`);
            filePaths = [];
          }

          return {
            id: ctx.id,
            name: ctx.name,
            description: ctx.description,
            filePaths,
            groupName: ctx.group_name || undefined,
          };
        } catch (parseError) {
          console.error(`[Screen Coverage] Failed to parse context ${ctx.id}:`, parseError);
          console.error(`[Screen Coverage] Problematic data:`, {
            file_paths: ctx.file_paths,
            type: typeof ctx.file_paths,
          });
          return null; // Skip invalid contexts
        }
      })
      .filter((ctx: ScreenCoverageContext | null): ctx is ScreenCoverageContext => ctx !== null); // Remove nulls

    console.log('[Screen Coverage] Successfully parsed contexts:', contexts.length);

    return {
      success: true,
      data: {
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        projectPort: activeProject.port || 3000,
        contexts,
        contextCount: contexts.length,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Screen coverage scan failed';
    console.error('[Screen Coverage] Scan error:', error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Convert a string to a safe filename slug
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

/**
 * Create requirement file for a single context screen coverage
 */
async function createScreenCoverageRequirement(
  context: {
    id: string;
    name: string;
    description: string | null;
    filePaths: string[];
  },
  projectId: string,
  projectName: string,
  projectPath: string,
  projectPort: number
): Promise<{ requirementName: string; requirementPath: string }> {
  // Import the prompt generator
  const { generateScreenCoveragePrompt } = await import('./prompts/screenCoveragePrompt');

  // Build screen coverage prompt
  const promptContent = generateScreenCoveragePrompt({
    projectId,
    projectName,
    projectPath,
    projectPort,
    contextId: context.id,
    contextName: context.name,
    contextDescription: context.description || 'No description provided',
    contextFilePaths: context.filePaths,
  });

  // Create safe filename slug from context name
  const contextSlug = createSlug(context.name);
  const requirementName = `screen-coverage-${contextSlug}`;

  console.log(`[Screen Coverage] Creating requirement: ${requirementName} for context: ${context.name}`);

  // Create requirement file
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
 * Create event for screen coverage scan
 */
async function createScreenCoverageEvent(
  projectId: string,
  contextCount: number,
  taskIds: string[]
): Promise<void> {
  await fetch('/api/blueprint/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      title: 'Screen Coverage Scan Completed',
      description: `Generated ${contextCount} screen coverage requirements for contexts without test scenarios`,
      type: 'success',
      agent: 'blueprint',
      message: `Task IDs: ${taskIds.join(', ')}`,
    }),
  });
}

/**
 * Build decision data for screen coverage scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[Screen Coverage] No active project');
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'screen-coverage-error',
      title: 'Screen Coverage Scan Failed',
      description: `An error occurred while scanning for contexts:\n\n${result.error || 'Unknown error'
        }\n\nPlease check the console for more details.`,
      severity: 'error',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { error: result.error },
      onAccept: async () => { },
      onReject: async () => { },
    };
  }

  if (!result.data) {
    console.error('[Screen Coverage] result.data is missing');
    return null;
  }

  const contexts = result.data.contexts || [];
  const contextCount = contexts.length;

  // No contexts without test scenarios
  if (contextCount === 0) {
    return {
      type: 'screen-coverage-complete',
      title: 'All Contexts Have Test Scenarios',
      description: `✅ All contexts in this project already have test scenarios defined.\n\nNo screen coverage work needed.`,
      severity: 'info',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { contexts: [] },
      onAccept: async () => { },
      onReject: async () => { },
    };
  }

  const description = `🔍 **Project**: ${activeProject.name}
📁 **Path**: ${activeProject.path}
📸 **Contexts Without Test Scenarios**: ${contextCount}

**What is Screen Coverage?**

This scan identifies contexts that don't have test scenarios and generates requirements to create them. Test scenarios enable automated screenshot capture for visual documentation.

**How it works:**
1. ✅ Select which contexts to cover (checkboxes below)
2. ✅ One Claude Code requirement per selected context
3. ✅ Claude analyzes UI components and navigation paths
4. ✅ Generates Playwright test scenarios
5. ✅ Saves scenarios to database for screenshot capture

**Select contexts below to generate coverage requirements.**`;

  // Execute screen coverage with selected batch
  const handleExecute = async (selectedContextIds: string[], batchId: BatchId) => {
    if (selectedContextIds.length === 0) {
      toast.error('No contexts selected', {
        description: 'Please select at least one context to generate screen coverage.',
      });
      return;
    }

    try {
      const taskRunnerStore = useTaskRunnerStore.getState();
      const taskIds: string[] = [];

      // Ensure batch exists
      let batch = taskRunnerStore.batches[batchId];
      if (!batch) {
        taskRunnerStore.createBatch(batchId, 'Screen Coverage', []);
        // Re-fetch batch after creation
        batch = useTaskRunnerStore.getState().batches[batchId];
      }

      // Filter selected contexts
      const selectedContexts = contexts.filter((ctx) => selectedContextIds.includes(ctx.id));

      // Create requirement for each selected context
      for (const context of selectedContexts) {
        try {
          const { requirementName } = await createScreenCoverageRequirement(
            context,
            activeProject.id,
            activeProject.name,
            activeProject.path,
            result.data!.projectPort
          );

          // Build task ID
          const taskId = `${activeProject.id}:${requirementName}`;
          taskIds.push(taskId);

          // Add task to batch
          taskRunnerStore.addTaskToBatch(batchId, taskId);
          console.log(`[Screen Coverage] Added task for ${context.name} to ${batchId}:`, taskId);
        } catch (error) {
          console.error(`[Screen Coverage] Failed to create requirement for ${context.name}:`, error);
          // Continue with other contexts
        }
      }

      // Re-fetch current batch state before starting
      batch = useTaskRunnerStore.getState().batches[batchId];
      if (batch && !isBatchRunning(batch.status) && taskIds.length > 0) {
        taskRunnerStore.startBatch(batchId);
        console.log('[Screen Coverage] Started batch:', batchId);
      }

      // Create event
      await createScreenCoverageEvent(activeProject.id, selectedContexts.length, taskIds);

      console.log('[Screen Coverage] All requirements created:', {
        selectedCount: selectedContexts.length,
        batchId,
        taskIds,
      });

      // Show success toast
      toast.success(`${selectedContexts.length} screen coverage requirements queued in ${batchId}`, {
        description: `Test scenarios will be generated for selected contexts. Check TaskRunner for progress.`,
      });

      // Close decision panel
      const { useDecisionQueueStore } = await import('@/stores/decisionQueueStore');
      useDecisionQueueStore.getState().acceptDecision();
    } catch (error) {
      console.error('[Screen Coverage] Failed to queue tasks:', error);
      toast.error('Failed to queue screen coverage tasks', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Cancel handler
  const handleCancel = async () => {
    console.log('[Screen Coverage] User cancelled scan');
    const { useDecisionQueueStore } = await import('@/stores/decisionQueueStore');
    useDecisionQueueStore.getState().rejectDecision();
  };

  // Custom content with context selection and batch selection
  const customContent = React.createElement(ScreenCoverageWithBatchSelection, {
    contexts,
    onExecute: handleExecute,
    onCancel: handleCancel,
  });

  return {
    type: 'screen-coverage-selection',
    title: 'Generate Screen Coverage Requirements?',
    description,
    count: contextCount,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    customContent,
    data: result.data,

    // These are just placeholders since the actual handlers are in the component
    onAccept: async () => { },
    onReject: async () => { },
  };
}

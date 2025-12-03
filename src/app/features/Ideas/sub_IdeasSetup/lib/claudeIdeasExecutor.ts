/**
 * Claude Ideas Executor (Client-Side)
 *
 * Handles generating ideas using Claude Code by:
 * 1. Calling the server API to build prompts with context/goals
 * 2. Using the pipeline to create and execute requirements
 */

import { ScanType, SCAN_TYPE_CONFIGS } from '../../lib/scanTypes';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { executeFireAndForget, PipelineConfig } from '@/app/features/Onboarding/sub_Blueprint/lib/pipeline';

export interface ClaudeIdeasExecutorConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contextIds: string[];  // Support multiple contexts
  batchId: BatchId;
}

export interface ClaudeIdeasExecutorResult {
  success: boolean;
  tasksCreated: number;
  taskIds: string[];
  errors: string[];
}

interface ClaudeIdeasApiResponse {
  success: boolean;
  requirementName: string;
  requirementContent: string;
  scanType: ScanType;
  contextId: string | null;
  error?: string;
}

/**
 * Execute Claude Ideas generation for multiple scan types and contexts
 * Creates Claude Code requirement files and queues them for processing
 */
export async function executeClaudeIdeasWithContexts(config: ClaudeIdeasExecutorConfig): Promise<ClaudeIdeasExecutorResult> {
  console.log('[ClaudeIdeasExecutor] === STARTING EXECUTION ===');
  console.log('[ClaudeIdeasExecutor] Config:', JSON.stringify({
    projectId: config.projectId,
    projectName: config.projectName,
    projectPath: config.projectPath,
    scanTypesCount: config.scanTypes.length,
    scanTypes: config.scanTypes,
    contextIdsCount: config.contextIds.length,
    batchId: config.batchId
  }, null, 2));

  const result: ClaudeIdeasExecutorResult = {
    success: false,
    tasksCreated: 0,
    taskIds: [],
    errors: []
  };

  // Validate required fields
  if (!config.projectPath) {
    const errorMsg = 'projectPath is required but was empty or undefined';
    console.error('[ClaudeIdeasExecutor] VALIDATION ERROR:', errorMsg);
    result.errors.push(errorMsg);
    return result;
  }

  if (!config.scanTypes || config.scanTypes.length === 0) {
    const errorMsg = 'No scan types selected';
    console.error('[ClaudeIdeasExecutor] VALIDATION ERROR:', errorMsg);
    result.errors.push(errorMsg);
    return result;
  }

  // Build list of context IDs to process (empty array means full project analysis)
  const contextsToProcess = config.contextIds.length > 0
    ? config.contextIds
    : [undefined]; // undefined means full project analysis

  // Process each scan type for each context
  for (const scanType of config.scanTypes) {
    for (const contextId of contextsToProcess) {
      const scanConfig = SCAN_TYPE_CONFIGS.find(s => s.value === scanType);
      const scanLabel = scanConfig?.label ?? scanType;
      const contextLabel = contextId ? `ctx-${contextId.slice(0, 8)}` : 'full-project';

      console.log(`[ClaudeIdeasExecutor] Processing: ${scanLabel} for ${contextLabel}`);

      try {
        // Step 1: Call API to build prompt with context/goals
        console.log('[ClaudeIdeasExecutor] Calling /api/ideas/claude to build prompt...');
        const apiResponse = await fetch('/api/ideas/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: config.projectId,
            projectName: config.projectName,
            projectPath: config.projectPath,
            scanType,
            contextId
          })
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json().catch(() => ({ error: 'Unknown API error' }));
          throw new Error(errorData.error || `API returned ${apiResponse.status}`);
        }

        const apiResult: ClaudeIdeasApiResponse = await apiResponse.json();

        if (!apiResult.success) {
          throw new Error(apiResult.error || 'Failed to build requirement content');
        }

        console.log(`[ClaudeIdeasExecutor] Requirement name: ${apiResult.requirementName}`);
        console.log(`[ClaudeIdeasExecutor] Requirement content length: ${apiResult.requirementContent.length} chars`);

        // Step 2: Use pipeline to create and execute the requirement
        const pipelineConfig: PipelineConfig = {
          projectPath: config.projectPath,
          projectId: config.projectId,
          requirementName: apiResult.requirementName,
          requirementContent: apiResult.requirementContent,
          onProgress: (progress, message) => {
            console.log(`[ClaudeIdeasExecutor] ${scanLabel}/${contextLabel}: ${progress}% - ${message}`);
          },
          onComplete: (pipelineResult) => {
            console.log(`[ClaudeIdeasExecutor] ${scanLabel}/${contextLabel}: Task completed`, pipelineResult.taskId);
          },
          onError: (error) => {
            console.error(`[ClaudeIdeasExecutor] ${scanLabel}/${contextLabel}: Pipeline error`, error.message);
          }
        };

        // Execute fire-and-forget (don't wait for completion)
        const pipelineResult = await executeFireAndForget(pipelineConfig);

        console.log(`[ClaudeIdeasExecutor] Pipeline result:`, JSON.stringify(pipelineResult, null, 2));

        if (pipelineResult.success && pipelineResult.taskId) {
          result.tasksCreated++;
          result.taskIds.push(pipelineResult.taskId);
          console.log(`[ClaudeIdeasExecutor] SUCCESS: Task created with ID ${pipelineResult.taskId}`);
        } else {
          const errorMsg = `${scanLabel}/${contextLabel}: ${pipelineResult.error || 'Unknown error (no taskId)'}`;
          result.errors.push(errorMsg);
          console.error(`[ClaudeIdeasExecutor] FAILED:`, errorMsg);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${scanLabel}/${contextLabel}: ${errorMessage}`);
        console.error(`[ClaudeIdeasExecutor] EXCEPTION:`, errorMessage);
      }
    }
  }

  result.success = result.tasksCreated > 0;
  console.log('[ClaudeIdeasExecutor] === EXECUTION COMPLETE ===');
  console.log('[ClaudeIdeasExecutor] Final result:', JSON.stringify(result, null, 2));
  return result;
}

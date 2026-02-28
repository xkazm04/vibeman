/**
 * Claude Ideas Executor (Client-Side)
 *
 * Handles generating ideas using Claude Code by:
 * 1. Calling the server API to build prompts with context/goals
 * 2. Creating Claude Code requirement files (user manages execution via TaskRunner)
 *
 * Selection model: flat list of context IDs. Groups are expanded to
 * individual contexts at the UI layer before reaching here.
 */

import { ScanType, SCAN_TYPE_CONFIGS } from '../../lib/scanTypes';
import { createRequirementOnly, PipelineConfig } from '@/app/features/Onboarding/sub_Blueprint/lib/pipeline';

export interface ClaudeIdeasExecutorConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contextIds: string[];  // Individual contexts (groups already expanded)
  goalId?: string;       // Goal ID for goal-driven scans
}

export interface ClaudeIdeasExecutorResult {
  success: boolean;
  filesCreated: number;
  requirementPaths: string[];
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
 * Creates Claude Code requirement files only - user manages execution via TaskRunner
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
  }, null, 2));

  const result: ClaudeIdeasExecutorResult = {
    success: false,
    filesCreated: 0,
    requirementPaths: [],
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

  // Build list of context IDs to process (empty = full project)
  const contextIds: Array<string | undefined> = config.contextIds.length > 0
    ? config.contextIds
    : [undefined]; // undefined means full project analysis

  // Process each scan type for each context
  for (const scanType of config.scanTypes) {
    for (const contextId of contextIds) {
      const scanConfig = SCAN_TYPE_CONFIGS.find(s => s.value === scanType);
      const scanLabel = scanConfig?.label ?? scanType;
      const itemLabel = contextId
        ? `ctx-${contextId.slice(0, 8)}`
        : 'full-project';

      console.log(`[ClaudeIdeasExecutor] Processing: ${scanLabel} for ${itemLabel}`);

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
            contextId,
            goalId: config.goalId,
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

        // Step 2: Create the requirement file only (user will manage execution via TaskRunner)
        const pipelineConfig: PipelineConfig = {
          projectPath: config.projectPath,
          projectId: config.projectId,
          requirementName: apiResult.requirementName,
          requirementContent: apiResult.requirementContent,
          onProgress: (progress, message) => {
            console.log(`[ClaudeIdeasExecutor] ${scanLabel}/${itemLabel}: ${progress}% - ${message}`);
          },
          onComplete: (pipelineResult) => {
            console.log(`[ClaudeIdeasExecutor] ${scanLabel}/${itemLabel}: Requirement file created`, pipelineResult.requirementPath);
          },
          onError: (error) => {
            console.error(`[ClaudeIdeasExecutor] ${scanLabel}/${itemLabel}: Pipeline error`, error.message);
          }
        };

        // Create requirement file only (no auto-execution)
        const pipelineResult = await createRequirementOnly(pipelineConfig);

        console.log(`[ClaudeIdeasExecutor] Pipeline result:`, JSON.stringify(pipelineResult, null, 2));

        if (pipelineResult.success && pipelineResult.requirementPath) {
          result.filesCreated++;
          result.requirementPaths.push(pipelineResult.requirementPath);
          console.log(`[ClaudeIdeasExecutor] SUCCESS: Requirement file created at ${pipelineResult.requirementPath}`);
        } else {
          const errorMsg = `${scanLabel}/${itemLabel}: ${pipelineResult.error || 'Unknown error (no requirementPath)'}`;
          result.errors.push(errorMsg);
          console.error(`[ClaudeIdeasExecutor] FAILED:`, errorMsg);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${scanLabel}/${itemLabel}: ${errorMessage}`);
        console.error(`[ClaudeIdeasExecutor] EXCEPTION:`, errorMessage);
      }
    }
  }

  result.success = result.filesCreated > 0;
  console.log('[ClaudeIdeasExecutor] === EXECUTION COMPLETE ===');
  console.log('[ClaudeIdeasExecutor] Final result:', JSON.stringify(result, null, 2));
  return result;
}

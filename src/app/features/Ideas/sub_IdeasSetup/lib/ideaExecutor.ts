/**
 * Unified Idea Executor
 *
 * Single interface for both LLM-based scanning and Claude Code requirement
 * file generation. Each strategy accepts a common ExecutionConfig and
 * delegates to its backend.
 *
 * LLM path:   gatherCodebaseFiles → /api/ideas/generate
 * Claude path: /api/ideas/claude   → /api/claude-code/requirement
 */

import { ScanType, getAgent } from '../../lib/scanTypes';
import { SupportedProvider } from '@/lib/llm/types';
import { gatherCodebaseFiles, executeScan, GatherFilesError } from '../../lib/scanApi';

export { GatherFilesError };

// ── Shared types ────────────────────────────────────────────────────────

/** Per-task progress status reported to onProgress. */
export type ScanProgressStatus = 'success' | 'error';

/**
 * Progress callback invoked once per (scanType × target) task as the loop
 * advances. `done` is the number of tasks completed (success or error) so far,
 * `total` the full task count, `label` the "agent × context" pair just run.
 */
export type ScanProgressCallback = (
  done: number,
  total: number,
  label: string,
  status: ScanProgressStatus,
) => void;

export interface ExecutionConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contextIds: string[];
  groupIds?: string[];
  goalId?: string;
  detailed?: boolean;
  /** YouTube URL for the youtube_scout scan type */
  youtubeUrl?: string;
  /** Aborts the in-flight fetch and stops the loop between tasks. */
  signal?: AbortSignal;
  /** Invoked after each (scanType × target) task completes (success or error). */
  onProgress?: ScanProgressCallback;
}

export interface ExecutionResult {
  success: boolean;
  /** Number of items produced (ideas for LLM, requirement files for Claude) */
  itemCount: number;
  /** Paths of created requirement files (Claude path only) */
  requirementPaths: string[];
  errors: string[];
}

export interface IdeaExecutor {
  execute(config: ExecutionConfig): Promise<ExecutionResult>;
}

// ── LLM Executor ────────────────────────────────────────────────────────

export interface LlmExecutorOptions {
  provider: SupportedProvider;
  contextFilePaths?: string[];
}

/**
 * Execute a single LLM scan for one scan type and optional context.
 * This is the low-level function used by scanQueueWorker and lifecycle API
 * which process one (scanType, context) pair at a time.
 */
export async function executeLlmScan(params: {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanType: ScanType;
  provider: SupportedProvider;
  contextId?: string;
  contextFilePaths?: string[];
  signal?: AbortSignal;
}): Promise<number> {
  const { projectPath, contextFilePaths, signal, ...restParams } = params;

  const codebaseFiles = await gatherCodebaseFiles(projectPath, contextFilePaths, signal);

  if (codebaseFiles.length === 0) {
    throw new Error('No code files found to analyze');
  }

  return executeScan({
    ...restParams,
    projectPath,
    codebaseFiles,
    signal,
  });
}

// ── Claude Code Executor ────────────────────────────────────────────────

interface ClaudeIdeasApiResponse {
  success: boolean;
  requirementName: string;
  requirementContent: string;
  scanType: ScanType;
  contextId: string | null;
  error?: string;
}

/**
 * Execute Claude Code requirement file generation for multiple scan types
 * and contexts. Creates requirement files that users execute via TaskRunner.
 */
export async function executeClaudeCodeScan(config: ExecutionConfig): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    success: false,
    itemCount: 0,
    requirementPaths: [],
    errors: [],
  };

  if (!config.projectPath) {
    result.errors.push('projectPath is required but was empty or undefined');
    return result;
  }

  if (!config.scanTypes || config.scanTypes.length === 0) {
    result.errors.push('No scan types selected');
    return result;
  }

  // Determine iteration targets:
  // 1. Individual contexts selected → iterate over contextIds
  // 2. Groups selected (no individual contexts) → iterate over groupIds
  // 3. Neither → full project analysis (single pass)
  const hasContexts = config.contextIds.length > 0;
  const hasGroups = !hasContexts && (config.groupIds?.length ?? 0) > 0;

  type ScanTarget = { contextId?: string; groupId?: string; label: string };
  const targets: ScanTarget[] = hasContexts
    ? config.contextIds.map(id => ({ contextId: id, label: `ctx-${id.slice(0, 8)}` }))
    : hasGroups
      ? config.groupIds!.map(id => ({ groupId: id, label: `grp-${id.slice(0, 8)}` }))
      : [{ label: 'full-project' }];

  const total = config.scanTypes.length * targets.length;
  let done = 0;

  for (const scanType of config.scanTypes) {
    for (const target of targets) {
      // Stop cleanly between tasks when cancelled.
      if (config.signal?.aborted) {
        result.success = result.itemCount > 0;
        return result;
      }

      const scanConfig = getAgent(scanType);
      const scanLabel = scanConfig?.label ?? scanType;
      const itemLabel = target.label;
      const taskLabel = `${scanLabel} × ${itemLabel}`;

      try {
        // Step 1: Build prompt via API
        const apiResponse = await fetch('/api/ideas/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: config.projectId,
            projectName: config.projectName,
            projectPath: config.projectPath,
            scanType,
            contextId: target.contextId,
            groupId: target.groupId,
            goalId: config.goalId,
            detailed: config.detailed,
            youtubeUrl: config.youtubeUrl,
          }),
          signal: config.signal,
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json().catch(() => ({ error: 'Unknown API error' }));
          throw new Error(errorData.error || `API returned ${apiResponse.status}`);
        }

        const apiResult: ClaudeIdeasApiResponse = await apiResponse.json();

        if (!apiResult.success) {
          throw new Error(apiResult.error || 'Failed to build requirement content');
        }

        // Step 2: Write requirement file
        const writeResponse = await fetch('/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: config.projectPath,
            requirementName: apiResult.requirementName,
            content: apiResult.requirementContent,
            overwrite: true,
          }),
          signal: config.signal,
        });

        if (writeResponse.ok) {
          const writeResult = await writeResponse.json();
          result.itemCount++;
          result.requirementPaths.push(writeResult.filePath || apiResult.requirementName);
          done++;
          config.onProgress?.(done, total, taskLabel, 'success');
        } else {
          const writeError = await writeResponse.json().catch(() => ({ error: 'Unknown write error' }));
          result.errors.push(`${scanLabel}/${itemLabel}: ${writeError.error || writeError.details || 'Failed to write requirement file'}`);
          done++;
          config.onProgress?.(done, total, taskLabel, 'error');
        }
      } catch (error) {
        // A cancellation surfaces as an AbortError from fetch; stop without
        // recording it as a task error.
        if (config.signal?.aborted) {
          result.success = result.itemCount > 0;
          return result;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${scanLabel}/${itemLabel}: ${errorMessage}`);
        done++;
        config.onProgress?.(done, total, taskLabel, 'error');
      }
    }
  }

  result.success = result.itemCount > 0;
  return result;
}

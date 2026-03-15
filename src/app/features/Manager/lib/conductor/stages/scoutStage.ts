/**
 * Scout Stage — Parallel Context-Aware Idea Generation
 *
 * Builds (scanType, context) pairs and runs them in parallel batches
 * of `config.maxConcurrentScans` (default 4) using Promise.allSettled.
 * Each pair dispatches its own CLI session scoped to that scan type + context.
 *
 * Flow:
 * 1. Build all (scanType, context) pairs via balancingEngine
 * 2. Slice pairs into batches of maxConcurrentScans
 * 3. For each batch, launch all pairs concurrently:
 *    a. POST /api/ideas/claude → get requirementContent (the prompt)
 *    b. startExecution() → spawn CLI process with that prompt
 *    c. Poll execution status until completed/error
 *    d. Count ideas created in DB since execution started
 *    e. Emit progress callback with scan type, context name, idea count
 * 4. After each batch, check abort signal and idea cap before continuing
 */

import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import type { BalancingConfig, ScoutResult, ProcessLogEntry } from '../types';
import { selectScanPairs, type ScanPair } from '../balancingEngine';
import {
  startExecution,
  getExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig, CLIModel } from '@/lib/claude-terminal/types';
import { ideaDb, contextDb } from '@/app/db';

interface ScoutInput {
  projectId: string;
  projectPath: string;
  projectName: string;
  config: BalancingConfig;
  brainContext?: { topSignals?: Array<{ scanType?: string; contextId?: string; weight?: number }> };
  healingContext?: string;
  abortSignal?: AbortSignal;
  onProgress?: (
    event: ProcessLogEntry['event'],
    message: string,
    extra?: Partial<Pick<ProcessLogEntry, 'itemsOut' | 'durationMs' | 'error'>>
  ) => void;
}

/**
 * Execute the Scout stage: generate ideas using (scanType, context) pairs
 * in parallel batches of `config.maxConcurrentScans`.
 *
 * Each batch launches N pairs concurrently via Promise.allSettled.
 * After each batch completes, checks abort signal and idea cap.
 */
export async function executeScoutStage(input: ScoutInput): Promise<ScoutResult[]> {
  // Fetch project contexts for pair building
  const contexts = loadProjectContexts(input.projectId);

  // Build (scanType, context) pairs
  const pairs = selectScanPairs(input.config, contexts, input.brainContext);
  const results: ScoutResult[] = [];
  const maxConcurrent = input.config.maxConcurrentScans || 4;

  // Process pairs in parallel batches
  for (let i = 0; i < pairs.length; i += maxConcurrent) {
    if (input.abortSignal?.aborted) {
      input.onProgress?.('info', 'Scout stopped by user');
      break;
    }

    const batch = pairs.slice(i, i + maxConcurrent);
    input.onProgress?.(
      'info',
      `Launching batch of ${batch.length} scan${batch.length !== 1 ? 's' : ''} (${i + 1}-${i + batch.length}/${pairs.length})`
    );

    const batchPromises = batch.map(async (pair) => {
      const label = formatPairLabel(pair);
      try {
        input.onProgress?.('started', `Scanning ${label}...`);
        const scanStart = Date.now();
        const result = await generateIdeasForPair(
          input.projectId,
          input.projectPath,
          input.projectName,
          pair,
          input.config,
          input.healingContext,
          input.abortSignal
        );
        const durationMs = Date.now() - scanStart;
        input.onProgress?.(
          result.ideasGenerated > 0 ? 'completed' : 'info',
          `${label} — ${result.ideasGenerated} idea${result.ideasGenerated !== 1 ? 's' : ''}`,
          { itemsOut: result.ideasGenerated, durationMs }
        );
        return result;
      } catch (error) {
        console.error(`[scout] Failed ${label}:`, error);
        input.onProgress?.('failed', `${label} failed: ${String(error)}`, {
          error: String(error),
        });
        return {
          scanType: pair.scanType,
          contextId: pair.contextId ?? undefined,
          contextName: pair.contextName ?? undefined,
          ideasGenerated: 0,
          ideaIds: [],
        } as ScoutResult;
      }
    });

    const settled = await Promise.allSettled(batchPromises);
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
      // rejected case is already handled in the catch above
    }

    // Check idea cap after each batch
    const totalIdeas = results.reduce((sum, r) => sum + r.ideasGenerated, 0);
    if (totalIdeas >= input.config.maxIdeasPerCycle) {
      input.onProgress?.('info', `Idea cap reached (${totalIdeas}/${input.config.maxIdeasPerCycle})`);
      break;
    }
  }

  return results;
}

/**
 * Generate ideas for a single (scanType, context) pair.
 */
async function generateIdeasForPair(
  projectId: string,
  projectPath: string,
  projectName: string,
  pair: ScanPair,
  config: BalancingConfig,
  healingContext?: string,
  abortSignal?: AbortSignal
): Promise<ScoutResult> {
  // Step 1: Get the requirement content (prompt) from the ideas API
  const response = await fetch(`${getBaseUrl()}/api/ideas/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      projectName,
      projectPath,
      scanType: pair.scanType,
      contextId: pair.contextId ?? undefined,
      healingContext,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ideas API failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Unknown error generating ideas');
  }

  const requirementContent = data.requirementContent;
  if (!requirementContent) {
    throw new Error('No requirement content returned from ideas API');
  }

  // Prepend healing context if available
  const fullPrompt = healingContext
    ? `${healingContext}\n\n---\n\n${requirementContent}`
    : requirementContent;

  // Step 2: Record ideas before execution to calculate diff
  const ideasBefore = ideaDb.getIdeasByProject(projectId);
  const ideasBeforeIds = new Set(ideasBefore.map(i => i.id));

  // Step 3: Dispatch to CLI for execution
  const providerConfig: CLIProviderConfig = {
    provider: config.scanProvider,
    model: (config.scanModel || undefined) as CLIModel | undefined,
  };

  const executionId = startExecution(
    projectPath,
    fullPrompt,
    undefined, // no resume session
    undefined, // no onEvent callback needed
    providerConfig,
    {
      VIBEMAN_PROJECT_ID: projectId,
      VIBEMAN_SCAN_TYPE: pair.scanType,
      ...(pair.contextId ? { VIBEMAN_CONTEXT_ID: pair.contextId } : {}),
    }
  );

  console.log(`[scout] Started CLI execution ${executionId} for ${formatPairLabel(pair)}`);

  // Step 4: Wait for CLI execution to complete (poll every 5s, max 10min)
  const maxWaitMs = 10 * 60 * 1000;
  const pollIntervalMs = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Check abort signal every poll cycle
    if (abortSignal?.aborted) {
      throw new Error(`Scout aborted by user during ${formatPairLabel(pair)}`);
    }

    const execution = getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found — may have been cleaned up`);
    }

    if (execution.status === 'completed') {
      break;
    }

    if (execution.status === 'error' || execution.status === 'aborted') {
      throw new Error(`CLI execution ${execution.status}: ${formatPairLabel(pair)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Check if we timed out
  const finalExec = getExecution(executionId);
  if (finalExec && finalExec.status === 'running') {
    throw new Error(`CLI execution timed out after ${maxWaitMs / 1000}s for ${formatPairLabel(pair)}`);
  }

  // Step 5: Count new ideas created during execution
  const ideasAfter = ideaDb.getIdeasByProject(projectId);
  const newIdeas = ideasAfter.filter(i => !ideasBeforeIds.has(i.id));
  const newIdeaIds = newIdeas.map(i => i.id);

  console.log(`[scout] ${formatPairLabel(pair)}: ${newIdeaIds.length} new ideas generated`);

  return {
    scanType: pair.scanType,
    contextId: pair.contextId ?? undefined,
    contextName: pair.contextName ?? undefined,
    scanId: data.requirementName,
    ideasGenerated: newIdeaIds.length,
    ideaIds: newIdeaIds,
  };
}

/**
 * Load project contexts for pair building.
 */
function loadProjectContexts(projectId: string): Array<{ id: string; name: string; category?: string }> {
  try {
    const contexts = contextDb.getContextsByProject(projectId);
    if (!Array.isArray(contexts)) return [];
    return contexts.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category ?? undefined,
    }));
  } catch {
    return [];
  }
}

function formatPairLabel(pair: ScanPair): string {
  if (pair.contextName) {
    return `${pair.scanType} on "${pair.contextName}"`;
  }
  return `${pair.scanType} (full project)`;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

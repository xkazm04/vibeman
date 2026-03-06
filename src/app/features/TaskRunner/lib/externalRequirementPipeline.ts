/**
 * External Requirement Pipeline
 *
 * Unified 3-stage pipeline: Analyze → Execute → Cleanup
 * Processes requirements from Supabase through context-aware analysis,
 * CLI execution, and automated cleanup.
 */

import path from 'path';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import {
  claimRequirement,
  updateRequirementStatus,
  fetchOpenRequirements,
} from '@/lib/supabase/external-requirements';
import { getDeviceId } from '@/lib/supabase/project-sync';
import {
  createRequirement,
  deleteRequirement,
} from '@/app/Claude/sub_ClaudeCodeManager/folderManager';
import {
  startExecution,
  getExecution,
  abortExecution,
} from '@/lib/claude-terminal/cli-service';
import { buildExternalTaskPrompt } from './externalPromptTemplate';
import type { CLIProvider, CLIProviderConfig, CLIModel } from '@/lib/claude-terminal/types';
import type {
  ExternalRequirement,
  ExternalPipelineConfig,
  MatchedContext,
} from '@/lib/supabase/external-types';
import type { DbContext } from '@/app/db/models/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PipelineResult {
  requirementId: string;
  requirementTitle: string;
  success: boolean;
  stage: 'analyze' | 'execute' | 'cleanup';
  error?: string;
  durationMs: number;
  implementationLogId?: string;
}

export interface PipelineProgress {
  requirementId: string;
  stage: 'claiming' | 'analyzing' | 'executing' | 'cleanup' | 'completed' | 'failed';
  message: string;
}

type ProgressCallback = (progress: PipelineProgress) => void;

// ── Pipeline Orchestration ─────────────────────────────────────────────────

/**
 * Process a single external requirement through the full pipeline.
 */
export async function processExternalRequirement(
  requirement: ExternalRequirement,
  projectId: string,
  projectPath: string,
  config: ExternalPipelineConfig,
  onProgress?: ProgressCallback,
): Promise<PipelineResult> {
  const startTime = Date.now();
  const reqName = `ext-${requirement.id.slice(0, 8)}`;

  try {
    // ── Stage 0: Claim ─────────────────────────────────────────────────
    onProgress?.({
      requirementId: requirement.id,
      stage: 'claiming',
      message: `Claiming: ${requirement.title}`,
    });

    const claimed = await claimRequirement(requirement.id);
    if (!claimed) {
      return {
        requirementId: requirement.id,
        requirementTitle: requirement.title,
        success: false,
        stage: 'analyze',
        error: 'Failed to claim requirement (may have been claimed by another device)',
        durationMs: Date.now() - startTime,
      };
    }

    // ── Stage 1: Analyze ───────────────────────────────────────────────
    onProgress?.({
      requirementId: requirement.id,
      stage: 'analyzing',
      message: `Analyzing contexts for: ${requirement.title}`,
    });

    const contexts = contextRepository.getContextsByProject(projectId);
    const matchedContexts = matchContextsToRequirement(requirement, contexts);
    const enrichedPrompt = buildEnrichedPrompt(
      requirement,
      matchedContexts,
      projectId,
      projectPath,
    );

    // Update status to in_progress
    await updateRequirementStatus(requirement.id, { status: 'in_progress' });

    // ── Stage 2: Execute ───────────────────────────────────────────────
    onProgress?.({
      requirementId: requirement.id,
      stage: 'executing',
      message: `Executing: ${requirement.title}`,
    });

    // Create local requirement file
    createRequirement(projectPath, reqName, enrichedPrompt, true);

    // Dispatch to CLI
    const providerConfig: CLIProviderConfig = {
      provider: config.provider as CLIProvider,
      model: (config.model || undefined) as CLIModel | undefined,
    };

    const executionId = startExecution(
      projectPath,
      enrichedPrompt,
      undefined, // no resume
      undefined, // no onEvent
      providerConfig,
      {
        VIBEMAN_PROJECT_ID: projectId,
        VIBEMAN_REQUIREMENT: reqName,
        VIBEMAN_EXTERNAL_REQ_ID: requirement.id,
      },
    );

    console.log(
      `[ext-pipeline] Started execution ${executionId} for ${reqName} (${config.provider}/${config.model})`,
    );

    // Poll for completion
    const timeoutMs = config.timeoutMs ?? 600_000; // 10 min default
    const result = await pollExecution(executionId, timeoutMs, config.abortSignal);

    // ── Stage 3: Cleanup ───────────────────────────────────────────────
    onProgress?.({
      requirementId: requirement.id,
      stage: 'cleanup',
      message: `Cleaning up: ${requirement.title}`,
    });

    if (result.success) {
      // Create implementation log
      const logId = crypto.randomUUID();
      implementationLogRepository.createLog({
        id: logId,
        project_id: projectId,
        requirement_name: reqName,
        title: requirement.title,
        overview: `External requirement from ${requirement.source_app}: ${requirement.description.slice(0, 500)}`,
      });

      // Update Supabase: implemented + link log
      await updateRequirementStatus(requirement.id, {
        status: 'implemented',
        implementation_log_id: logId,
        completed_at: new Date().toISOString(),
      });

      // Delete local requirement file
      deleteRequirement(projectPath, reqName);

      onProgress?.({
        requirementId: requirement.id,
        stage: 'completed',
        message: `Completed: ${requirement.title}`,
      });

      return {
        requirementId: requirement.id,
        requirementTitle: requirement.title,
        success: true,
        stage: 'cleanup',
        durationMs: Date.now() - startTime,
        implementationLogId: logId,
      };
    } else {
      // Execution failed — keep local file for debugging
      await updateRequirementStatus(requirement.id, {
        status: 'failed',
        error_message: result.error || 'CLI execution failed',
      });

      onProgress?.({
        requirementId: requirement.id,
        stage: 'failed',
        message: `Failed: ${requirement.title} — ${result.error}`,
      });

      return {
        requirementId: requirement.id,
        requirementTitle: requirement.title,
        success: false,
        stage: 'execute',
        error: result.error,
        durationMs: Date.now() - startTime,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Best-effort status update
    await updateRequirementStatus(requirement.id, {
      status: 'failed',
      error_message: errorMsg,
    }).catch(() => {});

    onProgress?.({
      requirementId: requirement.id,
      stage: 'failed',
      message: `Error: ${errorMsg}`,
    });

    return {
      requirementId: requirement.id,
      requirementTitle: requirement.title,
      success: false,
      stage: 'analyze',
      error: errorMsg,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Process all open external requirements for a project, sequentially.
 */
export async function processExternalRequirementQueue(
  projectId: string,
  projectPath: string,
  config: ExternalPipelineConfig,
  onProgress?: ProgressCallback,
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  const { requirements } = await fetchOpenRequirements(projectId, ['open']);
  if (requirements.length === 0) return results;

  for (const req of requirements) {
    if (config.abortSignal?.aborted) break;

    const result = await processExternalRequirement(
      req,
      projectId,
      projectPath,
      config,
      onProgress,
    );
    results.push(result);
  }

  return results;
}

// ── Context Matching ────────────────────────────────────────────────────────

/**
 * Match an external requirement to relevant contexts based on:
 * 1. context_hints from 3rd-party (direct name/path match)
 * 2. Keyword overlap (requirement words vs context keywords)
 * 3. Category matching (requirement category vs context category)
 */
export function matchContextsToRequirement(
  requirement: ExternalRequirement,
  contexts: DbContext[],
): MatchedContext[] {
  if (contexts.length === 0) return [];

  const scored: Array<{ context: DbContext; score: number }> = [];

  // Tokenize requirement text for matching
  const reqWords = tokenize(
    `${requirement.title} ${requirement.description} ${requirement.category}`
  );

  // Parse context hints if provided
  let hintNames: string[] = [];
  let hintPaths: string[] = [];
  if (requirement.context_hints) {
    try {
      const hints = JSON.parse(requirement.context_hints);
      if (Array.isArray(hints)) {
        for (const hint of hints) {
          if (typeof hint === 'string') {
            if (hint.includes('/') || hint.includes('\\')) {
              hintPaths.push(hint.toLowerCase());
            } else {
              hintNames.push(hint.toLowerCase());
            }
          }
        }
      }
    } catch {
      // Plain text hint — treat as name hint
      hintNames = [requirement.context_hints.toLowerCase()];
    }
  }

  for (const ctx of contexts) {
    let score = 0;

    // 1. Direct name match from hints (highest weight)
    if (hintNames.some((h) => ctx.name.toLowerCase().includes(h) || h.includes(ctx.name.toLowerCase()))) {
      score += 10;
    }

    // 2. File path overlap from hints
    if (hintPaths.length > 0 && ctx.file_paths) {
      try {
        const ctxPaths: string[] = JSON.parse(ctx.file_paths);
        const overlap = hintPaths.filter((hp) =>
          ctxPaths.some((cp) => cp.toLowerCase().includes(hp) || hp.includes(cp.toLowerCase()))
        );
        score += overlap.length * 5;
      } catch { /* ignore */ }
    }

    // 3. Keyword overlap
    if (ctx.keywords) {
      try {
        const contextKeywords: string[] = JSON.parse(ctx.keywords);
        const keywordSet = new Set(contextKeywords.map((k) => k.toLowerCase()));
        const overlap = reqWords.filter((w) => keywordSet.has(w));
        score += overlap.length * 2;
      } catch { /* ignore */ }
    }

    // 4. Category match
    if (ctx.category && requirement.category) {
      const catMap: Record<string, string[]> = {
        bugfix: ['api', 'lib', 'ui'],
        feature: ['ui', 'lib', 'api'],
        refactor: ['lib', 'api'],
        test: ['lib', 'api'],
        docs: ['ui'],
      };
      const relevantCategories = catMap[requirement.category.toLowerCase()] ?? [];
      if (relevantCategories.includes(ctx.category)) {
        score += 1;
      }
    }

    // 5. Description keyword overlap
    if (ctx.description) {
      const descWords = tokenize(ctx.description);
      const overlap = reqWords.filter((w) => descWords.includes(w));
      score += overlap.length * 0.5;
    }

    if (score > 0) {
      scored.push({ context: ctx, score });
    }
  }

  // Sort by score descending, take top 5
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  return top.map(({ context, score }) => {
    let filePaths: string[] = [];
    try {
      filePaths = JSON.parse(context.file_paths || '[]');
    } catch { /* ignore */ }

    return {
      id: context.id,
      name: context.name,
      description: context.description,
      filePaths,
      entryPoints: context.entry_points,
      dbTables: context.db_tables,
      apiSurface: context.api_surface,
      techStack: context.tech_stack,
      matchScore: score,
    };
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function buildEnrichedPrompt(
  requirement: ExternalRequirement,
  matchedContexts: MatchedContext[],
  projectId: string,
  projectPath: string,
): string {
  const dbPath = path.join(process.cwd(), 'database', 'goals.db');

  return buildExternalTaskPrompt({
    title: requirement.title,
    description: requirement.description,
    reasoning: requirement.reasoning,
    category: requirement.category,
    priority: requirement.priority,
    effort: requirement.effort,
    impact: requirement.impact,
    risk: requirement.risk,
    sourceApp: requirement.source_app,
    externalRequirementId: requirement.id,
    matchedContexts,
    contextHints: requirement.context_hints,
    baseParams: {
      requirementContent: '', // Will be replaced by enriched content
      dbPath,
      projectId,
      projectIdComment: `Project ID: \`${projectId}\``,
      projectIdValue: ` (use: "${projectId}")`,
      gitSection: '', // External requirements don't auto-commit
    },
  });
}

async function pollExecution(
  executionId: string,
  timeoutMs: number,
  abortSignal?: AbortSignal,
): Promise<{ success: boolean; error?: string; durationMs: number }> {
  const startTime = Date.now();
  const pollIntervalMs = 5000;

  while (Date.now() - startTime < timeoutMs) {
    if (abortSignal?.aborted) {
      abortExecution(executionId);
      return {
        success: false,
        error: 'Aborted by user',
        durationMs: Date.now() - startTime,
      };
    }

    const execution = getExecution(executionId);
    if (!execution) {
      return {
        success: false,
        error: `Execution ${executionId} not found — may have been cleaned up`,
        durationMs: Date.now() - startTime,
      };
    }

    if (execution.status === 'completed') {
      return { success: true, durationMs: Date.now() - startTime };
    }

    if (execution.status === 'error' || execution.status === 'aborted') {
      return {
        success: false,
        error: `CLI execution ${execution.status}`,
        durationMs: Date.now() - startTime,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timed out
  abortExecution(executionId);
  return {
    success: false,
    error: `Execution timed out after ${timeoutMs / 1000}s`,
    durationMs: Date.now() - startTime,
  };
}

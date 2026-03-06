/**
 * Conductor Orchestrator — Server-side pipeline state machine
 *
 * Manages the pipeline loop: Scout → Triage → Batch → Execute → Review
 * Each stage calls into existing Vibeman modules via API endpoints.
 * Self-healing triggers automatically when error thresholds are reached.
 */

import { getDatabase } from '@/app/db/connection';
import type {
  PipelineRun,
  PipelineStage,
  PipelineMetrics,
  BalancingConfig,
  StageState,
  ErrorClassification,
  HealingPatch,
  ProcessLogEntry,
} from './types';
import { createEmptyStages, createEmptyMetrics } from './types';
import { v4 as uuidv4 } from 'uuid';
import { executeScoutStage } from './stages/scoutStage';
import { executeTriageStage } from './stages/triageStage';
import { executeBatchStage } from './stages/batchStage';
import { executeExecuteStage } from './stages/executeStage';
import { executeReviewStage } from './stages/reviewStage';
import { analyzeErrors } from './selfHealing/healingAnalyzer';
import { buildHealingContext } from './selfHealing/promptPatcher';
import { performTaskCleanup } from '@/lib/execution/taskCleanup';

// ============================================================================
// Orchestrator State (in-memory, survives HMR)
// ============================================================================

const globalForConductor = globalThis as unknown as {
  conductorActiveRuns: Map<string, ConductorRunContext>;
};

if (!globalForConductor.conductorActiveRuns) {
  globalForConductor.conductorActiveRuns = new Map();

  // Ensure process_log column exists (idempotent)
  try {
    const db = getDatabase();
    db.exec(`ALTER TABLE conductor_runs ADD COLUMN process_log TEXT DEFAULT '[]'`);
  } catch {
    // Column already exists — ignore
  }
}

interface ConductorRunContext {
  runId: string;
  projectId: string;
  config: BalancingConfig;
  abortController: AbortController;
  status: string; // 'running' | 'paused' | 'stopping'
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start a new pipeline run. Runs asynchronously in the background.
 */
export function startPipeline(
  runId: string,
  projectId: string,
  config: BalancingConfig,
  projectPath?: string,
  projectName?: string
): void {
  const abortController = new AbortController();

  const context: ConductorRunContext = {
    runId,
    projectId,
    config,
    abortController,
    status: 'running',
  };

  globalForConductor.conductorActiveRuns.set(runId, context);

  // Run pipeline loop in background (non-blocking)
  runPipelineLoop(context, projectPath || '', projectName || 'Project').catch((error) => {
    console.error(`[conductor] Pipeline ${runId} fatal error:`, error);
    updateRunInDb(runId, { status: 'failed' });
  }).finally(() => {
    globalForConductor.conductorActiveRuns.delete(runId);
  });
}

/**
 * Pause an active pipeline run.
 */
export function pausePipeline(runId: string): boolean {
  const context = globalForConductor.conductorActiveRuns.get(runId);
  if (!context) return false;
  context.status = 'paused';
  return true;
}

/**
 * Resume a paused pipeline run.
 */
export function resumePipeline(runId: string): boolean {
  const context = globalForConductor.conductorActiveRuns.get(runId);
  if (!context) return false;
  context.status = 'running';
  return true;
}

/**
 * Stop a pipeline run gracefully.
 */
export function stopPipeline(runId: string): boolean {
  const context = globalForConductor.conductorActiveRuns.get(runId);
  if (!context) return false;
  context.status = 'stopping';
  context.abortController.abort();
  return true;
}

/**
 * Get active run context (for status checks).
 */
export function getActiveRun(runId: string): ConductorRunContext | undefined {
  return globalForConductor.conductorActiveRuns.get(runId);
}

/**
 * Recover orphaned runs after app crash/restart.
 * Queries DB for runs still marked 'running' or 'paused' that have no
 * corresponding entry in globalThis.conductorActiveRuns (their async loop died).
 * Marks them as 'interrupted' so the UI can show appropriate status.
 */
export function recoverOrphanedRuns(): string[] {
  try {
    const db = getDatabase();
    const orphanedRows = db.prepare(`
      SELECT id, project_id, status, current_stage, cycle
      FROM conductor_runs
      WHERE status IN ('running', 'paused')
      ORDER BY created_at DESC
    `).all() as any[];

    const orphanedIds: string[] = [];

    for (const row of orphanedRows) {
      const hasActiveContext = globalForConductor.conductorActiveRuns.has(row.id);
      if (!hasActiveContext) {
        db.prepare(`
          UPDATE conductor_runs
          SET status = 'interrupted', completed_at = ?
          WHERE id = ?
        `).run(new Date().toISOString(), row.id);
        orphanedIds.push(row.id);
        console.log(`[conductor] Recovered orphaned run ${row.id} (was ${row.status} at stage ${row.current_stage})`);
      }
    }

    return orphanedIds;
  } catch (error) {
    console.error('[conductor] Recovery check failed:', error);
    return [];
  }
}

// ============================================================================
// Pipeline Loop
// ============================================================================

async function runPipelineLoop(
  context: ConductorRunContext,
  projectPath: string,
  projectName: string
): Promise<void> {
  const { runId, projectId, config } = context;
  let cycle = 1;
  let metrics = createEmptyMetrics();
  let allErrors: ErrorClassification[] = [];
  let activePatches: HealingPatch[] = [];
  const processLog: ProcessLogEntry[] = [];

  // Helper: add a log entry and persist to DB
  const log = (
    stage: PipelineStage,
    event: ProcessLogEntry['event'],
    message: string,
    extra?: Partial<Pick<ProcessLogEntry, 'itemsIn' | 'itemsOut' | 'error' | 'durationMs'>>
  ) => {
    processLog.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      stage,
      event,
      message,
      cycle,
      ...extra,
    });
    updateRunInDb(runId, { process_log: JSON.stringify(processLog) });
  };

  // Load existing patches for this project
  try {
    activePatches = await loadActivePatches(projectId);
  } catch {
    // Continue without patches
  }

  while (cycle <= (config.maxCyclesPerRun || 3)) {
    // Check for pause/stop signals
    if (context.status === 'stopping') {
      log('review', 'info', 'Pipeline stopped by user');
      updateRunInDb(runId, { status: 'completed', completed_at: new Date().toISOString() });
      return;
    }

    if (context.status === 'paused') {
      log('scout', 'info', 'Pipeline paused — waiting for resume');
      await waitForResume(context);
      if ((context.status as string) === 'stopping') {
        log('review', 'info', 'Pipeline stopped while paused');
        updateRunInDb(runId, { status: 'completed', completed_at: new Date().toISOString() });
        return;
      }
      log('scout', 'info', 'Pipeline resumed');
    }

    // Update cycle in DB
    updateRunInDb(runId, { cycle, current_stage: 'scout' });

    // Build healing context from active patches
    const healingContext = buildHealingContext(activePatches);

    // ---- SCOUT ----
    const scoutStart = Date.now();
    updateStageInDb(runId, 'scout', { status: 'running', startedAt: new Date().toISOString() });
    const scanTypeNames = config.scanTypes.slice(0, 3).join(', ') + (config.scanTypes.length > 3 ? '...' : '');
    log('scout', 'started', `Scanning with ${scanTypeNames} (context: ${config.contextStrategy})`);

    let scoutResults;
    try {
      scoutResults = await executeScoutStage({
        projectId,
        projectPath,
        projectName,
        config,
        healingContext: healingContext || undefined,
        abortSignal: context.abortController.signal,
        onProgress: (event, message, extra) => {
          log('scout', event, message, extra);
        },
      });

      const ideasGenerated = scoutResults.reduce((sum, r) => sum + r.ideasGenerated, 0);
      metrics.ideasGenerated += ideasGenerated;
      const scoutDuration = Date.now() - scoutStart;

      updateStageInDb(runId, 'scout', {
        status: 'completed',
        completedAt: new Date().toISOString(),
        itemsIn: 0,
        itemsOut: ideasGenerated,
      });

      log('scout', 'completed', `Generated ${ideasGenerated} idea${ideasGenerated !== 1 ? 's' : ''}`, {
        itemsOut: ideasGenerated,
        durationMs: scoutDuration,
      });

      if (ideasGenerated === 0) {
        // 0 ideas is a failure — classify as error for healing
        log('scout', 'failed', 'Scout generated 0 ideas — marking as failure for self-healing', {
          error: 'Zero ideas generated across all scan types',
        });

        const zeroIdeasError: ErrorClassification = {
          id: uuidv4(),
          pipelineRunId: runId,
          stage: 'scout',
          errorType: 'invalid_output',
          errorMessage: `Scout generated 0 ideas for scan types: ${scanTypeNames}. The CLI may have failed to analyze the project or save ideas to the API.`,
          occurrenceCount: 1,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          resolved: false,
        };
        allErrors.push(zeroIdeasError);

        updateStageInDb(runId, 'scout', {
          status: 'failed',
          error: 'Zero ideas generated',
        });
        updateStageInDb(runId, 'triage', { status: 'skipped' });
        updateStageInDb(runId, 'batch', { status: 'skipped' });
        updateStageInDb(runId, 'execute', { status: 'skipped' });

        // Trigger healing if enabled
        if (config.healingEnabled) {
          log('review', 'info', `Self-healing triggered — analyzing ${allErrors.length} error${allErrors.length !== 1 ? 's' : ''}`);
          try {
            const newPatches = await analyzeErrors(allErrors, runId);
            activePatches = [...activePatches, ...newPatches];
            metrics.healingPatchesApplied += newPatches.length;
            for (const patch of newPatches) {
              saveErrorToDb(runId, allErrors);
              savePatchToDb(patch);
              log('review', 'info', `Applied healing patch: ${patch.reason}`);
            }
          } catch (healError) {
            log('review', 'info', `Healing analysis failed: ${String(healError)}`);
          }
        }

        updateStageInDb(runId, 'review', { status: 'completed' });
        log('review', 'completed', `Cycle ${cycle} failed — 0 ideas generated. ${cycle < (config.maxCyclesPerRun || 3) ? 'Retrying with healing...' : 'Max cycles reached.'}`);

        // Continue to next cycle (with healing patches applied) instead of breaking
        cycle++;
        continue;
      }
    } catch (error) {
      log('scout', 'failed', `Scout failed: ${String(error)}`, { error: String(error) });
      updateStageInDb(runId, 'scout', {
        status: 'failed',
        error: String(error),
      });
      updateRunInDb(runId, { status: 'failed' });
      return;
    }

    if (context.status === 'stopping') break;

    // ---- TRIAGE ----
    const triageStart = Date.now();
    updateStageInDb(runId, 'triage', { status: 'running', startedAt: new Date().toISOString() });
    updateRunInDb(runId, { current_stage: 'triage' });

    let triageResult;
    try {
      const allIdeaIds = scoutResults.flatMap((r) => r.ideaIds);
      const ideas = await fetchIdeas(allIdeaIds, projectId);

      log('triage', 'started', `Evaluating ${ideas.length} idea${ideas.length !== 1 ? 's' : ''} against thresholds`, {
        itemsIn: ideas.length,
      });

      triageResult = await executeTriageStage({
        ideas,
        config,
        projectId,
        projectPath,
        projectName,
        abortSignal: context.abortController.signal,
        onProgress: (event, message, extra) => {
          log('triage', event, message, extra);
        },
      });

      metrics.ideasAccepted += triageResult.acceptedIds.length;
      metrics.ideasRejected += triageResult.rejectedIds.length;
      const triageDuration = Date.now() - triageStart;

      updateStageInDb(runId, 'triage', {
        status: 'completed',
        completedAt: new Date().toISOString(),
        itemsIn: ideas.length,
        itemsOut: triageResult.acceptedIds.length,
      });

      log('triage', 'completed', `Accepted ${triageResult.acceptedIds.length}, rejected ${triageResult.rejectedIds.length}`, {
        itemsIn: ideas.length,
        itemsOut: triageResult.acceptedIds.length,
        durationMs: triageDuration,
      });

      if (triageResult.acceptedIds.length === 0) {
        log('batch', 'skipped', 'No accepted ideas to batch');
        log('execute', 'skipped', 'No tasks to execute');
        updateStageInDb(runId, 'batch', { status: 'skipped' });
        updateStageInDb(runId, 'execute', { status: 'skipped' });
      }
    } catch (error) {
      log('triage', 'failed', `Triage failed: ${String(error)}`, { error: String(error) });
      updateStageInDb(runId, 'triage', {
        status: 'failed',
        error: String(error),
      });
      triageResult = { acceptedIds: [], rejectedIds: [], skippedIds: [] };
    }

    if (context.status === 'stopping') break;

    // ---- BATCH ----
    let batchDescriptor;
    if (triageResult.acceptedIds.length > 0) {
      const batchStart = Date.now();
      updateStageInDb(runId, 'batch', { status: 'running', startedAt: new Date().toISOString() });
      updateRunInDb(runId, { current_stage: 'batch' });

      log('batch', 'started', `Creating requirement files for ${triageResult.acceptedIds.length} idea${triageResult.acceptedIds.length !== 1 ? 's' : ''}`, {
        itemsIn: triageResult.acceptedIds.length,
      });

      try {
        const acceptedIdeas = await fetchIdeas(triageResult.acceptedIds, projectId);
        const enrichedIdeas = await enrichIdeasWithContext(acceptedIdeas, projectId);

        batchDescriptor = await executeBatchStage({
          acceptedIdeas: enrichedIdeas.map((idea) => ({
            ...idea,
            requirementName: undefined,
          })),
          config,
          projectId,
          projectPath,
          projectName,
        });

        metrics.tasksCreated += batchDescriptor.requirementNames.length;
        const batchDuration = Date.now() - batchStart;

        updateStageInDb(runId, 'batch', {
          status: 'completed',
          completedAt: new Date().toISOString(),
          itemsIn: triageResult.acceptedIds.length,
          itemsOut: batchDescriptor.requirementNames.length,
        });

        log('batch', 'completed', `Batched ${batchDescriptor.requirementNames.length} task${batchDescriptor.requirementNames.length !== 1 ? 's' : ''} with ${config.batchStrategy} strategy`, {
          itemsOut: batchDescriptor.requirementNames.length,
          durationMs: batchDuration,
        });
      } catch (error) {
        log('batch', 'failed', `Batch failed: ${String(error)}`, { error: String(error) });
        updateStageInDb(runId, 'batch', {
          status: 'failed',
          error: String(error),
        });
        batchDescriptor = null;
      }
    }

    if (context.status === 'stopping') break;

    // ---- EXECUTE ----
    let executionResults;
    if (batchDescriptor && batchDescriptor.requirementNames.length > 0) {
      const executeStart = Date.now();
      updateStageInDb(runId, 'execute', { status: 'running', startedAt: new Date().toISOString() });
      updateRunInDb(runId, { current_stage: 'execute' });

      const dispatchDetails = batchDescriptor.requirementNames
        .map((name) => {
          const assignment = batchDescriptor.modelAssignments[name];
          return assignment ? `${name} → ${assignment.provider}/${assignment.model}` : name;
        })
        .slice(0, 3)
        .join(', ');
      log('execute', 'started', `Dispatching ${batchDescriptor.requirementNames.length} task${batchDescriptor.requirementNames.length !== 1 ? 's' : ''}: ${dispatchDetails}${batchDescriptor.requirementNames.length > 3 ? '...' : ''}`, {
        itemsIn: batchDescriptor.requirementNames.length,
      });

      try {
        const executeResult = await executeExecuteStage({
          batch: batchDescriptor,
          config,
          projectId,
          projectPath,
          projectName,
          abortSignal: context.abortController.signal,
          onTaskUpdate: (tasks) => {
            updateStageInDb(runId, 'execute', {
              details: { executionTasks: tasks },
            });
          },
        });

        executionResults = executeResult.results;
        const succeeded = executeResult.results.filter((r) => r.success).length;
        const failed = executeResult.results.length - succeeded;
        const executeDuration = Date.now() - executeStart;

        updateStageInDb(runId, 'execute', {
          status: 'completed',
          completedAt: new Date().toISOString(),
          itemsIn: batchDescriptor.requirementNames.length,
          itemsOut: succeeded,
        });

        log('execute', 'completed', `${succeeded}/${executeResult.results.length} tasks succeeded${failed > 0 ? `, ${failed} failed` : ''}`, {
          itemsOut: succeeded,
          durationMs: executeDuration,
        });

        // Log individual failures and clean up successful conductor requirement files
        for (const result of executeResult.results) {
          if (!result.success && result.error) {
            log('execute', 'failed', `Task ${result.requirementName} failed: ${result.error}`, {
              error: result.error,
            });
          } else if (result.success) {
            // Full cleanup cascade: update idea status → ensure impl log → delete requirement file
            if (result.requirementName.startsWith('conductor-')) {
              await performTaskCleanup({
                projectPath,
                requirementName: result.requirementName,
                projectId,
                baseUrl: getBaseUrl(),
              });
            }
          }
        }
      } catch (error) {
        log('execute', 'failed', `Execution failed: ${String(error)}`, { error: String(error) });
        updateStageInDb(runId, 'execute', {
          status: 'failed',
          error: String(error),
        });
        executionResults = [];
      }
    }

    if (context.status === 'stopping') break;

    // ---- REVIEW ----
    const reviewStart = Date.now();
    updateStageInDb(runId, 'review', { status: 'running', startedAt: new Date().toISOString() });
    updateRunInDb(runId, { current_stage: 'review' });
    log('review', 'started', 'Analyzing execution results');

    try {
      const reviewResult = await executeReviewStage({
        executionResults: executionResults || [],
        currentMetrics: metrics,
        currentCycle: cycle,
        config,
        projectId,
      });

      metrics = reviewResult.updatedMetrics;
      allErrors = [...allErrors, ...reviewResult.errors];

      // Trigger self-healing if needed
      if (reviewResult.decision.healingTriggered && config.healingEnabled) {
        log('review', 'info', `Self-healing triggered — analyzing ${allErrors.length} error${allErrors.length !== 1 ? 's' : ''}`);
        try {
          const newPatches = await analyzeErrors(allErrors, runId);
          activePatches = [...activePatches, ...newPatches];
          metrics.healingPatchesApplied += newPatches.length;

          for (const patch of newPatches) {
            saveErrorToDb(runId, allErrors);
            savePatchToDb(patch);
            log('review', 'info', `Applied healing patch: ${patch.reason}`);
          }
        } catch (healError) {
          log('review', 'info', `Healing analysis failed: ${String(healError)}`);
          console.error('[conductor] Healing analysis failed:', healError);
        }
      }

      const reviewDuration = Date.now() - reviewStart;
      const successRate = Math.round(reviewResult.decision.successRate * 100);

      updateStageInDb(runId, 'review', {
        status: 'completed',
        completedAt: new Date().toISOString(),
        itemsIn: (executionResults || []).length,
        itemsOut: reviewResult.decision.shouldContinue ? 1 : 0,
      });

      log('review', 'completed', `Success rate ${successRate}% — ${reviewResult.decision.shouldContinue ? `continuing to cycle ${cycle + 1}` : 'pipeline complete'} (cycle ${cycle}/${config.maxCyclesPerRun || 3})`, {
        durationMs: reviewDuration,
      });

      // Update metrics in DB
      updateRunInDb(runId, { metrics: JSON.stringify(metrics) });

      if (!reviewResult.decision.shouldContinue) {
        updateRunInDb(runId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        return;
      }
    } catch (error) {
      log('review', 'failed', `Review failed: ${String(error)}`, { error: String(error) });
      updateStageInDb(runId, 'review', {
        status: 'failed',
        error: String(error),
      });
      updateRunInDb(runId, { status: 'failed' });
      return;
    }

    cycle++;
  }

  // Max cycles reached
  log('review', 'completed', `Max cycles reached (${config.maxCyclesPerRun || 3}) — pipeline complete`);
  updateRunInDb(runId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    metrics: JSON.stringify(metrics),
  });
}

// ============================================================================
// Helpers
// ============================================================================

async function waitForResume(context: ConductorRunContext): Promise<void> {
  while (context.status === 'paused') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function fetchIdeas(ideaIds: string[], projectId: string): Promise<any[]> {
  if (ideaIds.length === 0) return [];

  try {
    const response = await fetch(
      `${getBaseUrl()}/api/ideas?projectId=${projectId}&withColors=false`
    );
    if (!response.ok) return [];
    const data = await response.json();
    const allIdeas = data.ideas || data.data || [];

    // Filter to only requested IDs
    return allIdeas.filter((i: any) => ideaIds.includes(i.id));
  } catch {
    return [];
  }
}

/**
 * Enrich ideas with context metadata (name, file_paths) from the contexts API.
 * This bridges the gap between thin idea objects and the rich context data
 * needed for high-quality requirement generation.
 */
async function enrichIdeasWithContext(ideas: any[], projectId: string): Promise<any[]> {
  // Collect unique context IDs
  const contextIds = [...new Set(
    ideas.map((i: any) => i.context_id).filter(Boolean)
  )] as string[];

  if (contextIds.length === 0) return ideas;

  // Fetch all project contexts in one call
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/contexts?projectId=${projectId}`
    );
    if (!response.ok) return ideas;
    const data = await response.json();
    const contexts = data?.data?.contexts || data?.contexts || [];

    // Build lookup map
    const contextMap = new Map<string, any>();
    for (const ctx of contexts) {
      contextMap.set(ctx.id, ctx);
    }

    // Enrich each idea with context metadata
    return ideas.map((idea: any) => {
      if (!idea.context_id) return idea;
      const ctx = contextMap.get(idea.context_id);
      if (!ctx) return idea;
      return {
        ...idea,
        context_name: ctx.name || idea.context_name,
        context_file_paths: ctx.file_paths || null,
      };
    });
  } catch {
    return ideas;
  }
}

async function loadActivePatches(projectId: string): Promise<HealingPatch[]> {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/conductor/healing?projectId=${projectId}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return (data.patches || []).filter((p: HealingPatch) => !p.reverted);
  } catch {
    return [];
  }
}

function updateRunInDb(runId: string, updates: Record<string, any>): void {
  try {
    const db = getDatabase();
    const setClauses = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE conductor_runs SET ${setClauses} WHERE id = ?`).run(
      ...values,
      runId
    );
  } catch (error) {
    console.error('[conductor] DB update failed:', error);
  }
}

function updateStageInDb(
  runId: string,
  stage: PipelineStage,
  stageUpdate: Partial<StageState> & { itemsIn?: number; itemsOut?: number }
): void {
  try {
    const db = getDatabase();
    const row = db.prepare(`SELECT stages_state FROM conductor_runs WHERE id = ?`).get(runId) as any;
    if (!row) return;

    const stages = JSON.parse(row.stages_state || '{}');
    stages[stage] = { ...stages[stage], ...stageUpdate };

    db.prepare(`UPDATE conductor_runs SET stages_state = ?, current_stage = ? WHERE id = ?`).run(
      JSON.stringify(stages),
      stage,
      runId
    );
  } catch (error) {
    console.error('[conductor] Stage update failed:', error);
  }
}

function saveErrorToDb(runId: string, errors: ErrorClassification[]): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO conductor_errors
      (id, pipeline_run_id, stage, error_type, error_message, task_id, scan_type, occurrence_count, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const err of errors) {
      stmt.run(
        err.id,
        runId,
        err.stage,
        err.errorType,
        err.errorMessage,
        err.taskId || null,
        err.scanType || null,
        err.occurrenceCount,
        err.firstSeen,
        err.lastSeen
      );
    }
  } catch (error) {
    console.error('[conductor] Error save failed:', error);
  }
}

function savePatchToDb(patch: HealingPatch): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO conductor_healing_patches
      (id, pipeline_run_id, target_type, target_id, original_value, patched_value, reason, error_pattern, applied_at, reverted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      patch.id,
      patch.pipelineRunId,
      patch.targetType,
      patch.targetId,
      patch.originalValue,
      patch.patchedValue,
      patch.reason,
      patch.errorPattern,
      patch.appliedAt
    );
  } catch (error) {
    console.error('[conductor] Patch save failed:', error);
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

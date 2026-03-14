/**
 * Conductor Orchestrator — Server-side pipeline state machine
 *
 * Manages the pipeline loop: Scout -> Triage -> Batch -> Execute -> Review
 * Each stage calls into existing Vibeman modules via API endpoints.
 * Self-healing triggers automatically when error thresholds are reached.
 *
 * DB-first state: All run state persists in SQLite via conductorRepository.
 * No globalThis Map for active runs. The DB is the source of truth.
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
import { conductorRepository } from './conductor.repository';
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
// Startup Recovery (DB-first, with HMR guard)
// ============================================================================

conductorRepository.markInterruptedRuns();

// ============================================================================
// In-memory abort controllers (ephemeral — only for signal propagation)
// ============================================================================

const abortControllers = new Map<string, AbortController>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Start a new pipeline run. Creates DB record first, then runs async loop.
 */
export function startPipeline(
  runId: string,
  projectId: string,
  config: BalancingConfig,
  projectPath?: string,
  projectName?: string,
  goalId?: string
): void {
  const abortController = new AbortController();
  abortControllers.set(runId, abortController);

  // Create the run in DB (status='running')
  conductorRepository.createRun({
    id: runId,
    projectId,
    goalId: goalId || '',
    config,
  });

  // Run pipeline loop in background (non-blocking)
  runPipelineLoop(runId, projectId, config, abortController, projectPath || '', projectName || 'Project').catch((error) => {
    console.error(`[conductor] Pipeline ${runId} fatal error:`, error);
    conductorRepository.updateRunStatus(runId, 'failed');
  }).finally(() => {
    abortControllers.delete(runId);
  });
}

/**
 * Pause an active pipeline run.
 */
export function pausePipeline(runId: string): boolean {
  const run = conductorRepository.getRunById(runId);
  if (!run || run.status !== 'running') return false;
  conductorRepository.updateRunStatus(runId, 'paused');
  return true;
}

/**
 * Resume a paused pipeline run.
 */
export function resumePipeline(runId: string): boolean {
  const run = conductorRepository.getRunById(runId);
  if (!run || run.status !== 'paused') return false;
  conductorRepository.updateRunStatus(runId, 'running');
  return true;
}

/**
 * Stop a pipeline run gracefully via abort flag.
 */
export function stopPipeline(runId: string): boolean {
  conductorRepository.setAbort(runId);
  const controller = abortControllers.get(runId);
  if (controller) {
    controller.abort();
  }
  return true;
}

/**
 * Get run status from DB.
 */
export function getActiveRun(runId: string) {
  return conductorRepository.getRunById(runId);
}

/**
 * Recover orphaned runs after app crash/restart.
 * Delegates to conductorRepository.markInterruptedRuns().
 */
export function recoverOrphanedRuns(): string[] {
  // Reset the guard so recovery can run again
  (globalThis as any).__conductorRecoveryDone = false;
  const count = conductorRepository.markInterruptedRuns();
  // Return empty array — the count is returned by markInterruptedRuns
  return [];
}

// ============================================================================
// Stage Execution with Persistence
// ============================================================================

/**
 * Execute a stage and persist its state to DB before and after.
 * Returns true if pipeline should continue, false if aborted.
 */
function executeStageAndPersist(
  runId: string,
  stage: PipelineStage,
  stageState: StageState
): void {
  conductorRepository.completeStage(runId, stage, stageState);
}

/**
 * Check if the pipeline should abort between stages.
 */
function shouldAbort(runId: string): boolean {
  return conductorRepository.checkAbort(runId);
}

// ============================================================================
// Pipeline Loop
// ============================================================================

async function runPipelineLoop(
  runId: string,
  projectId: string,
  config: BalancingConfig,
  abortController: AbortController,
  projectPath: string,
  projectName: string
): Promise<void> {
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
    // Check for abort between cycles
    if (shouldAbort(runId)) {
      log('review', 'info', 'Pipeline stopped by user');
      conductorRepository.updateRunStatus(runId, 'interrupted', metrics);
      return;
    }

    // Check for pause — read status from DB
    const currentRun = conductorRepository.getRunById(runId);
    if (currentRun?.status === 'paused') {
      log('scout', 'info', 'Pipeline paused -- waiting for resume');
      await waitForResume(runId);
      // After resume, check if it was stopped instead
      if (shouldAbort(runId)) {
        log('review', 'info', 'Pipeline stopped while paused');
        conductorRepository.updateRunStatus(runId, 'interrupted', metrics);
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
    executeStageAndPersist(runId, 'scout', { status: 'running', startedAt: new Date().toISOString(), itemsIn: 0, itemsOut: 0 });
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
        abortSignal: abortController.signal,
        onProgress: (event, message, extra) => {
          log('scout', event, message, extra);
        },
      });

      const ideasGenerated = scoutResults.reduce((sum, r) => sum + r.ideasGenerated, 0);
      metrics.ideasGenerated += ideasGenerated;
      const scoutDuration = Date.now() - scoutStart;

      executeStageAndPersist(runId, 'scout', {
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
        // 0 ideas is a failure -- classify as error for healing
        log('scout', 'failed', 'Scout generated 0 ideas -- marking as failure for self-healing', {
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

        executeStageAndPersist(runId, 'scout', {
          status: 'failed',
          error: 'Zero ideas generated',
          itemsIn: 0,
          itemsOut: 0,
        });
        executeStageAndPersist(runId, 'triage', { status: 'skipped', itemsIn: 0, itemsOut: 0 });
        executeStageAndPersist(runId, 'batch', { status: 'skipped', itemsIn: 0, itemsOut: 0 });
        executeStageAndPersist(runId, 'execute', { status: 'skipped', itemsIn: 0, itemsOut: 0 });

        // Trigger healing if enabled
        if (config.healingEnabled) {
          log('review', 'info', `Self-healing triggered -- analyzing ${allErrors.length} error${allErrors.length !== 1 ? 's' : ''}`);
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

        executeStageAndPersist(runId, 'review', { status: 'completed', itemsIn: 0, itemsOut: 0 });
        log('review', 'completed', `Cycle ${cycle} failed -- 0 ideas generated. ${cycle < (config.maxCyclesPerRun || 3) ? 'Retrying with healing...' : 'Max cycles reached.'}`);

        // Continue to next cycle (with healing patches applied) instead of breaking
        cycle++;
        continue;
      }
    } catch (error) {
      log('scout', 'failed', `Scout failed: ${String(error)}`, { error: String(error) });
      executeStageAndPersist(runId, 'scout', {
        status: 'failed',
        error: String(error),
        itemsIn: 0,
        itemsOut: 0,
      });
      conductorRepository.updateRunStatus(runId, 'failed', metrics);
      return;
    }

    if (shouldAbort(runId)) break;

    // ---- TRIAGE ----
    const triageStart = Date.now();
    executeStageAndPersist(runId, 'triage', { status: 'running', startedAt: new Date().toISOString(), itemsIn: 0, itemsOut: 0 });
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
        abortSignal: abortController.signal,
        onProgress: (event, message, extra) => {
          log('triage', event, message, extra);
        },
      });

      metrics.ideasAccepted += triageResult.acceptedIds.length;
      metrics.ideasRejected += triageResult.rejectedIds.length;
      const triageDuration = Date.now() - triageStart;

      executeStageAndPersist(runId, 'triage', {
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
        executeStageAndPersist(runId, 'batch', { status: 'skipped', itemsIn: 0, itemsOut: 0 });
        executeStageAndPersist(runId, 'execute', { status: 'skipped', itemsIn: 0, itemsOut: 0 });
      }
    } catch (error) {
      log('triage', 'failed', `Triage failed: ${String(error)}`, { error: String(error) });
      executeStageAndPersist(runId, 'triage', {
        status: 'failed',
        error: String(error),
        itemsIn: 0,
        itemsOut: 0,
      });
      triageResult = { acceptedIds: [], rejectedIds: [], skippedIds: [] };
    }

    if (shouldAbort(runId)) break;

    // ---- BATCH ----
    let batchDescriptor;
    if (triageResult.acceptedIds.length > 0) {
      const batchStart = Date.now();
      executeStageAndPersist(runId, 'batch', { status: 'running', startedAt: new Date().toISOString(), itemsIn: 0, itemsOut: 0 });
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

        executeStageAndPersist(runId, 'batch', {
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
        executeStageAndPersist(runId, 'batch', {
          status: 'failed',
          error: String(error),
          itemsIn: 0,
          itemsOut: 0,
        });
        batchDescriptor = null;
      }
    }

    if (shouldAbort(runId)) break;

    // ---- EXECUTE ----
    let executionResults;
    if (batchDescriptor && batchDescriptor.requirementNames.length > 0) {
      const executeStart = Date.now();
      executeStageAndPersist(runId, 'execute', { status: 'running', startedAt: new Date().toISOString(), itemsIn: 0, itemsOut: 0 });
      updateRunInDb(runId, { current_stage: 'execute' });

      const dispatchDetails = batchDescriptor.requirementNames
        .map((name) => {
          const assignment = batchDescriptor.modelAssignments[name];
          return assignment ? `${name} -> ${assignment.provider}/${assignment.model}` : name;
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
          abortSignal: abortController.signal,
          onTaskUpdate: (tasks) => {
            executeStageAndPersist(runId, 'execute', {
              status: 'running',
              itemsIn: 0,
              itemsOut: 0,
              details: { executionTasks: tasks },
            });
          },
        });

        executionResults = executeResult.results;
        const succeeded = executeResult.results.filter((r) => r.success).length;
        const failed = executeResult.results.length - succeeded;
        const executeDuration = Date.now() - executeStart;

        executeStageAndPersist(runId, 'execute', {
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
            // Full cleanup cascade: update idea status -> ensure impl log -> delete requirement file
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
        executeStageAndPersist(runId, 'execute', {
          status: 'failed',
          error: String(error),
          itemsIn: 0,
          itemsOut: 0,
        });
        executionResults = [];
      }
    }

    if (shouldAbort(runId)) break;

    // ---- REVIEW ----
    const reviewStart = Date.now();
    executeStageAndPersist(runId, 'review', { status: 'running', startedAt: new Date().toISOString(), itemsIn: 0, itemsOut: 0 });
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
        log('review', 'info', `Self-healing triggered -- analyzing ${allErrors.length} error${allErrors.length !== 1 ? 's' : ''}`);
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

      executeStageAndPersist(runId, 'review', {
        status: 'completed',
        completedAt: new Date().toISOString(),
        itemsIn: (executionResults || []).length,
        itemsOut: reviewResult.decision.shouldContinue ? 1 : 0,
      });

      log('review', 'completed', `Success rate ${successRate}% -- ${reviewResult.decision.shouldContinue ? `continuing to cycle ${cycle + 1}` : 'pipeline complete'} (cycle ${cycle}/${config.maxCyclesPerRun || 3})`, {
        durationMs: reviewDuration,
      });

      // Update metrics in DB
      conductorRepository.updateRunStatus(runId, 'running', metrics);

      if (!reviewResult.decision.shouldContinue) {
        conductorRepository.updateRunStatus(runId, 'completed', metrics);
        return;
      }
    } catch (error) {
      log('review', 'failed', `Review failed: ${String(error)}`, { error: String(error) });
      executeStageAndPersist(runId, 'review', {
        status: 'failed',
        error: String(error),
        itemsIn: 0,
        itemsOut: 0,
      });
      conductorRepository.updateRunStatus(runId, 'failed', metrics);
      return;
    }

    cycle++;
  }

  // Max cycles reached or aborted
  if (shouldAbort(runId)) {
    log('review', 'info', 'Pipeline aborted');
    conductorRepository.updateRunStatus(runId, 'interrupted', metrics);
  } else {
    log('review', 'completed', `Max cycles reached (${config.maxCyclesPerRun || 3}) -- pipeline complete`);
    conductorRepository.updateRunStatus(runId, 'completed', metrics);
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function waitForResume(runId: string): Promise<void> {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const run = conductorRepository.getRunById(runId);
    if (!run || run.status !== 'paused') break;
    if (conductorRepository.checkAbort(runId)) break;
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

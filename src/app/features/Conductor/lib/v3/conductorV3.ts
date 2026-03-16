/**
 * Conductor v3 Orchestrator
 *
 * 3-phase adaptive loop: PLAN -> DISPATCH -> REFLECT
 * with abort/pause/resume support and Brain integration.
 *
 * Each cycle: 2 LLM calls (plan + reflect), N task dispatches.
 * Reflection decides: done | continue (next cycle) | needs_input (pause).
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/app/db/connection';
import { conductorRepository } from '../conductor.repository';
import { executePlanPhase } from './planPhase';
import { runBuildValidation } from '../execution/buildValidator';
import { generateBrainQuestions, getBrainWarnings, feedBrainOutcome } from './brainAdvisor';
import type {
  V3Config,
  V3Metrics,
  V3Phase,
  V3ProcessLogEntry,
  V3Task,
  ReflectOutput,
  PhaseState,
} from './types';
import { createEmptyV3Metrics, createEmptyV3Phases } from './types';

// ============================================================================
// Abort Controllers (HMR-safe via module-level Map)
// ============================================================================

const abortControllers = new Map<string, AbortController>();

// ============================================================================
// Goal DB Row Type
// ============================================================================

interface GoalRow {
  id: string;
  title: string;
  description: string;
  target_paths: string | null;
}

// ============================================================================
// Dispatch Phase Types (forward-declared until dispatchPhase.ts exists)
// ============================================================================

interface DispatchPhaseInput {
  runId: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  tasks: V3Task[];
  config: V3Config;
  goalContext: { title: string; description: string };
  healingContext: string;
  autoCommit: boolean;
  abortSignal?: AbortSignal;
  onTaskUpdate?: (tasks: V3Task[]) => void;
}

interface DispatchPhaseResult {
  tasks: V3Task[];
  results: import('./types').V3TaskResult[];
}

interface ReflectPhaseInput {
  runId: string;
  projectId: string;
  projectPath: string;
  plannedTasks: V3Task[];
  config: V3Config;
  buildResult: { passed: boolean; errorOutput?: string; durationMs: number };
  currentCycle: number;
  currentMetrics: V3Metrics;
  goalTitle: string;
  goalDescription: string;
  abortSignal?: AbortSignal;
}

interface ReflectPhaseResult {
  output: ReflectOutput;
  updatedMetrics: V3Metrics;
}

// ============================================================================
// Lazy imports for phases that may not exist yet
// ============================================================================

async function loadDispatchPhase(): Promise<
  (input: DispatchPhaseInput) => Promise<DispatchPhaseResult>
> {
  try {
    const mod = await import('./dispatchPhase');
    return mod.executeDispatchPhase;
  } catch {
    // Stub: run tasks sequentially as no-ops when dispatchPhase doesn't exist yet
    return async (input: DispatchPhaseInput): Promise<DispatchPhaseResult> => {
      const results: import('./types').V3TaskResult[] = input.tasks.map(() => ({
        success: false,
        error: 'dispatchPhase not yet implemented',
        filesChanged: [],
        durationMs: 0,
        provider: 'claude',
        model: 'unknown',
      }));
      const tasks = input.tasks.map((t) => ({ ...t, status: 'failed' as const }));
      return { tasks, results };
    };
  }
}

async function loadReflectPhase(): Promise<
  (input: ReflectPhaseInput) => Promise<ReflectPhaseResult>
> {
  try {
    const mod = await import('./reflectPhase');
    return mod.executeReflectPhase;
  } catch {
    // Stub: return 'done' when reflectPhase doesn't exist yet
    return async (input: ReflectPhaseInput): Promise<ReflectPhaseResult> => {
      const completed = input.plannedTasks.filter((t) => t.status === 'completed').length;
      const failed = input.plannedTasks.filter((t) => t.status === 'failed').length;
      return {
        output: {
          status: 'done',
          summary: `Cycle ${input.currentCycle}: ${completed} completed, ${failed} failed (reflect stub)`,
          brainFeedback: '',
          lessonsLearned: [],
        },
        updatedMetrics: {
          ...input.currentMetrics,
          tasksCompleted: input.currentMetrics.tasksCompleted + completed,
          tasksFailed: input.currentMetrics.tasksFailed + failed,
        },
      };
    };
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the v3 pipeline. Creates a DB run record and launches the async loop.
 */
export function startV3Pipeline(
  runId: string,
  projectId: string,
  config: V3Config,
  projectPath: string,
  projectName: string,
  goalId: string,
  refinedIntent?: string
): void {
  // Create AbortController for this run
  const controller = new AbortController();
  abortControllers.set(runId, controller);

  // Create run in DB with v3 pipeline version (initial stage = 'plan')
  conductorRepository.createRun({
    id: runId,
    projectId,
    goalId,
    config: { ...config, pipelineVersion: 3 },
    pipelineVersion: 3,
  });

  // Fire-and-forget the main loop
  runV3Loop(runId, projectId, config, projectPath, projectName, goalId, refinedIntent).catch(
    (err) => {
      console.error(`[ConductorV3] Pipeline ${runId} crashed:`, err);
      conductorRepository.updateRunStatus(runId, 'failed');
      updateRunField(runId, 'error_message', String(err));
      abortControllers.delete(runId);
    }
  );
}

/**
 * Pause the v3 pipeline. The loop will pause at the next check point.
 */
export function pauseV3Pipeline(runId: string): boolean {
  conductorRepository.updateRunStatus(runId, 'paused');
  return true;
}

/**
 * Resume a paused v3 pipeline. Unblocks the waitForResume poll.
 */
export function resumeV3Pipeline(runId: string): boolean {
  conductorRepository.updateRunStatus(runId, 'running');
  return true;
}

/**
 * Stop the v3 pipeline. Sets abort flag and triggers the AbortController.
 */
export function stopV3Pipeline(runId: string): boolean {
  conductorRepository.setAbort(runId);
  const controller = abortControllers.get(runId);
  if (controller) {
    controller.abort();
    abortControllers.delete(runId);
  }
  conductorRepository.updateRunStatus(runId, 'interrupted');
  return true;
}

// ============================================================================
// Main Loop
// ============================================================================

async function runV3Loop(
  runId: string,
  projectId: string,
  config: V3Config,
  projectPath: string,
  projectName: string,
  goalId: string,
  refinedIntent?: string
): Promise<void> {
  const startTime = Date.now();
  const controller = abortControllers.get(runId);

  // Load goal record from DB
  const db = getDatabase();
  const goalRecord = db
    .prepare('SELECT id, title, description, target_paths FROM goals WHERE id = ?')
    .get(goalId) as GoalRow | undefined;

  if (!goalRecord) {
    console.error(`[ConductorV3] Goal ${goalId} not found`);
    conductorRepository.updateRunStatus(runId, 'failed');
    updateRunField(runId, 'error_message', `Goal ${goalId} not found`);
    abortControllers.delete(runId);
    return;
  }

  // Process log
  const processLog: V3ProcessLogEntry[] = [];
  let metrics = createEmptyV3Metrics();
  const phases = createEmptyV3Phases();
  let previousReflection: ReflectOutput | null = null;
  let cycle = 1;
  let currentPhase: V3Phase = 'plan';

  const log = (
    phase: V3Phase,
    event: V3ProcessLogEntry['event'],
    message: string,
    extra?: Partial<V3ProcessLogEntry>
  ) => {
    processLog.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      stage: phase,
      event,
      message,
      ...extra,
    });
    updateRunField(runId, 'process_log', JSON.stringify(processLog));
  };

  const persistState = () => {
    // Use direct DB update since persistFullState expects v2 PipelineStage keys
    const db2 = getDatabase();
    db2.prepare(
      `UPDATE conductor_runs
       SET metrics = ?, stages_state = ?, process_log = ?, cycle = ?, current_stage = ?
       WHERE id = ?`
    ).run(
      JSON.stringify(metrics),
      JSON.stringify(phases),
      JSON.stringify(processLog),
      cycle,
      currentPhase,
      runId
    );
  };

  // Load phase implementations (lazy, handles missing files)
  const executeDispatchPhase = await loadDispatchPhase();
  const executeReflectPhase = await loadReflectPhase();

  // ----- Optional: Brain Q&A (pre-cycle) -----
  if (config.brainQuestionsEnabled) {
    try {
      const questions = await generateBrainQuestions({
        projectId,
        projectPath,
        goalTitle: goalRecord.title,
        goalDescription: goalRecord.description,
      });

      if (questions.length > 0) {
        updateRunField(runId, 'brain_qa', JSON.stringify(questions));
        log('plan', 'info', `Brain generated ${questions.length} clarifying question(s)`);
      }
    } catch (err) {
      log('plan', 'info', `Brain question generation failed: ${err}`);
    }
  }

  // ----- Main Cycle Loop -----
  while (cycle <= config.maxCyclesPerRun) {
    if (shouldAbort(runId)) break;

    // ===================== PLAN =====================
    currentPhase = 'plan';
    phases.plan = {
      status: 'running',
      startedAt: new Date().toISOString(),
      itemsIn: 0,
      itemsOut: 0,
    };
    persistState();
    log('plan', 'started', `Cycle ${cycle}: Planning...`);

    const brainWarnings = getBrainWarnings({ projectId, projectPath });

    let planOutput;
    try {
      planOutput = await executePlanPhase({
        runId,
        projectId,
        projectPath,
        goalTitle: goalRecord.title,
        goalDescription: goalRecord.description,
        targetPaths: goalRecord.target_paths ? JSON.parse(goalRecord.target_paths) : null,
        config,
        brainWarnings,
        previousReflection,
        healingContext: '',
        refinedIntent: refinedIntent || null,
        abortSignal: controller?.signal,
      });
    } catch (err) {
      log('plan', 'failed', `Plan phase failed: ${err}`);
      phases.plan = { ...phases.plan, status: 'failed' };
      persistState();
      break;
    }

    metrics.tasksPlanned += planOutput.tasks.length;
    metrics.llmCallCount++;
    phases.plan = {
      status: 'completed',
      startedAt: phases.plan.startedAt,
      completedAt: new Date().toISOString(),
      itemsIn: 0,
      itemsOut: planOutput.tasks.length,
    };
    persistState();
    log('plan', 'completed', `${planOutput.tasks.length} task(s) planned`);

    if (planOutput.tasks.length === 0) {
      log('plan', 'info', 'No tasks planned, completing run');
      break;
    }

    if (shouldAbort(runId)) break;

    // ===================== DISPATCH =====================
    currentPhase = 'dispatch';
    phases.dispatch = {
      status: 'running',
      startedAt: new Date().toISOString(),
      itemsIn: planOutput.tasks.length,
      itemsOut: 0,
    };
    persistState();
    log('dispatch', 'started', `Dispatching ${planOutput.tasks.length} task(s)...`);

    let dispatchResult: DispatchPhaseResult;
    try {
      dispatchResult = await executeDispatchPhase({
        runId,
        projectId,
        projectPath,
        projectName,
        tasks: planOutput.tasks,
        config,
        goalContext: {
          title: goalRecord.title,
          description: goalRecord.description,
        },
        healingContext: '',
        autoCommit: config.autoCommit ?? false,
        abortSignal: controller?.signal,
        onTaskUpdate: () => {
          // Could emit to store for real-time UI updates
        },
      });
    } catch (err) {
      log('dispatch', 'failed', `Dispatch phase failed: ${err}`);
      phases.dispatch = { ...phases.dispatch, status: 'failed' };
      persistState();
      break;
    }

    const completedCount = dispatchResult.results.filter((r) => r.success).length;
    const failedCount = dispatchResult.results.filter((r) => !r.success).length;

    phases.dispatch = {
      status: 'completed',
      startedAt: phases.dispatch.startedAt,
      completedAt: new Date().toISOString(),
      itemsIn: planOutput.tasks.length,
      itemsOut: completedCount,
    };
    persistState();
    log('dispatch', 'completed', `${completedCount} completed, ${failedCount} failed`);

    // Build validation
    const buildResult = runBuildValidation(projectPath);
    log('dispatch', 'info', `Build validation: ${buildResult.passed ? 'PASSED' : 'FAILED'}`);

    if (shouldAbort(runId)) break;

    // ===================== REFLECT =====================
    currentPhase = 'reflect';
    phases.reflect = {
      status: 'running',
      startedAt: new Date().toISOString(),
      itemsIn: completedCount + failedCount,
      itemsOut: 0,
    };
    persistState();
    log('reflect', 'started', 'Analyzing results...');

    let reflectResult: ReflectPhaseResult;
    try {
      reflectResult = await executeReflectPhase({
        runId,
        projectId,
        projectPath,
        plannedTasks: dispatchResult.tasks,
        config,
        buildResult,
        currentCycle: cycle,
        currentMetrics: metrics,
        goalTitle: goalRecord.title,
        goalDescription: goalRecord.description,
        abortSignal: controller?.signal,
      });
    } catch (err) {
      log('reflect', 'failed', `Reflect phase failed: ${err}`);
      phases.reflect = { ...phases.reflect, status: 'failed' };
      persistState();
      break;
    }

    metrics = reflectResult.updatedMetrics;
    metrics.llmCallCount++;
    metrics.totalCycles = cycle;
    previousReflection = reflectResult.output;

    phases.reflect = {
      status: 'completed',
      startedAt: phases.reflect.startedAt,
      completedAt: new Date().toISOString(),
      itemsIn: completedCount + failedCount,
      itemsOut: reflectResult.output.nextTasks?.length ?? 0,
    };

    // Store reflection in history
    const reflectionHistory = getReflectionHistory(runId);
    reflectionHistory.push(reflectResult.output);
    updateRunField(runId, 'reflection_history', JSON.stringify(reflectionHistory));

    persistState();
    log('reflect', 'completed', `Reflect status: ${reflectResult.output.status}`);

    // Feed Brain (non-blocking)
    feedBrainOutcome({
      projectId,
      tasks: dispatchResult.tasks,
      reflectOutput: reflectResult.output,
    }).catch((err) => {
      console.warn('[ConductorV3] feedBrainOutcome failed:', err);
    });

    // ===================== DECISION =====================
    if (reflectResult.output.status === 'done') {
      log('reflect', 'info', 'Pipeline goal achieved, completing run');
      break;
    }

    if (reflectResult.output.status === 'needs_input') {
      conductorRepository.updateRunStatus(runId, 'paused');
      log('reflect', 'info', 'Waiting for user input');
      await waitForResume(runId);
      if (shouldAbort(runId)) break;
      // After resume, clear the refinedIntent so plan uses reflection context instead
      refinedIntent = undefined;
    }

    cycle++;
  }

  // ===================== COMPLETE =====================
  metrics.totalDurationMs = Date.now() - startTime;
  metrics.totalCycles = cycle;

  const finalStatus = shouldAbort(runId) ? 'interrupted' : 'completed';
  conductorRepository.updateRunStatus(runId, finalStatus, metrics as unknown as import('../types').PipelineMetrics);

  const finalPhase = currentPhase;
  log(
    finalPhase,
    'completed',
    `Pipeline finished: ${finalStatus} after ${cycle} cycle(s), ${metrics.totalDurationMs}ms`
  );

  abortControllers.delete(runId);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a run should be aborted (DB flag or AbortController).
 */
function shouldAbort(runId: string): boolean {
  return conductorRepository.checkAbort(runId);
}

/**
 * Poll DB every 2 seconds until run status is no longer 'paused' or abort is set.
 */
async function waitForResume(runId: string): Promise<void> {
  const POLL_INTERVAL_MS = 2000;
  const MAX_WAIT_MS = 24 * 60 * 60 * 1000; // 24 hours max
  const startWait = Date.now();

  while (Date.now() - startWait < MAX_WAIT_MS) {
    if (shouldAbort(runId)) return;

    const run = conductorRepository.getRunById(runId);
    if (!run || (run.status as string) !== 'paused') return;

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Get reflection history from run record.
 */
function getReflectionHistory(runId: string): ReflectOutput[] {
  try {
    const db = getDatabase();
    const row = db
      .prepare('SELECT reflection_history FROM conductor_runs WHERE id = ?')
      .get(runId) as { reflection_history?: string } | undefined;

    if (!row?.reflection_history) return [];
    return JSON.parse(row.reflection_history);
  } catch {
    return [];
  }
}

/**
 * Update a single field on a conductor_runs row.
 */
function updateRunField(runId: string, field: string, value: string): void {
  try {
    const db = getDatabase();
    // Use parameterized column name via allowlisted fields to prevent SQL injection
    const allowedFields = new Set([
      'process_log',
      'reflection_history',
      'brain_qa',
      'error_message',
      'current_stage',
    ]);

    if (!allowedFields.has(field)) {
      console.warn(`[ConductorV3] Attempted to update disallowed field: ${field}`);
      return;
    }

    db.prepare(`UPDATE conductor_runs SET ${field} = ? WHERE id = ?`).run(value, runId);
  } catch (err) {
    console.warn(`[ConductorV3] Failed to update ${field}:`, err);
  }
}

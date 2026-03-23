/**
 * Conductor V4 — Single-Session Autonomous Pipeline
 *
 * Replaces V3's multi-session PLAN → DISPATCH → REFLECT cycle
 * with one continuous Claude Code CLI session (1M context window).
 *
 * Flow: PRE-FLIGHT (gather context) → EXECUTE (single CLI session) → POST-FLIGHT (update DB)
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/app/db/connection';
import { conductorRepository } from '../conductor.repository';
import { buildV4Prompt } from './promptBuilder';
import {
  spawnV4Session,
  resumeV4Session,
  monitorSession,
  abortV4Session,
  isRateLimitError,
} from './sessionManager';
import { processPostFlight, processInterruptedRun } from './postFlight';
import type { V4RunConfig, V4PreFlightData, V4RunState } from './types';
import { logger } from '@/lib/logger';

/** Active V4 runs — maps runId to state */
const activeRuns = new Map<string, V4RunState>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Start a V4 pipeline run.
 * Fire-and-forget: returns immediately, runs asynchronously.
 */
export function startV4Pipeline(
  runId: string,
  projectId: string,
  config: V4RunConfig,
  projectPath: string,
  projectName: string,
  goalId: string,
): void {
  const state: V4RunState = {
    runId,
    projectId,
    goalId,
    status: 'starting',
    sessionName: `conductor-v4-${runId.substring(0, 12)}`,
    executionId: null,
    progress: 0,
    progressPhase: 'starting',
    progressMessage: 'Gathering context...',
    implementationLogs: [],
    resumeAttempts: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  activeRuns.set(runId, state);

  // Create DB record
  conductorRepository.createRun({
    id: runId,
    projectId,
    goalId,
    pipelineVersion: 4,
  });

  // Fire-and-forget async execution
  executeV4Pipeline(state, config, projectPath, projectName).catch(err => {
    logger.error(`[V4] Pipeline ${runId} failed:`, err);
    state.status = 'failed';
    conductorRepository.updateRunStatus(runId, 'failed');
  });
}

/**
 * Pause a running V4 pipeline.
 */
export function pauseV4Pipeline(runId: string): boolean {
  const state = activeRuns.get(runId);
  if (!state || state.status !== 'running') return false;

  if (state.executionId) {
    abortV4Session(state.executionId);
  }

  state.status = 'paused';
  conductorRepository.updateRunStatus(runId, 'paused');
  logger.info(`[V4] Pipeline ${runId} paused`);
  return true;
}

/**
 * Resume a paused V4 pipeline.
 */
export function resumeV4Pipeline(
  runId: string,
  projectPath: string,
  config: V4RunConfig,
): boolean {
  const state = activeRuns.get(runId);
  if (!state || state.status !== 'paused') return false;

  state.status = 'resuming';
  conductorRepository.updateRunStatus(runId, 'running');

  // Resume async
  resumeAndMonitor(state, config, projectPath).catch(err => {
    logger.error(`[V4] Resume ${runId} failed:`, err);
    state.status = 'failed';
  });

  return true;
}

/**
 * Stop a running V4 pipeline.
 */
export function stopV4Pipeline(runId: string): boolean {
  const state = activeRuns.get(runId);
  if (!state) return false;

  if (state.executionId) {
    abortV4Session(state.executionId);
  }

  state.status = 'interrupted';

  // Run post-flight for partial work
  processPostFlight(runId, state.projectId, state.startedAt, state.goalId);
  conductorRepository.updateRunStatus(runId, 'interrupted');

  activeRuns.delete(runId);
  logger.info(`[V4] Pipeline ${runId} stopped`);
  return true;
}

/**
 * Get the current state of a V4 run.
 */
export function getV4RunState(runId: string): V4RunState | undefined {
  return activeRuns.get(runId);
}

// ============================================================================
// Internal Execution
// ============================================================================

async function executeV4Pipeline(
  state: V4RunState,
  config: V4RunConfig,
  projectPath: string,
  projectName: string,
): Promise<void> {
  const { runId, projectId, goalId } = state;

  // ── PRE-FLIGHT ──
  logger.info(`[V4] Pre-flight for run ${runId}`);
  state.progressPhase = 'pre-flight';
  state.progressMessage = 'Gathering context from database...';

  const preFlightData = gatherPreFlightData(projectId, goalId, projectPath, projectName);

  // ── BUILD PROMPT ──
  state.progressMessage = 'Building master prompt...';
  const prompt = buildV4Prompt(preFlightData);

  logger.info(`[V4] Prompt built: ${prompt.length} chars, ${preFlightData.contexts.length} contexts, ${preFlightData.knowledge.length} KB entries`);

  // ── SPAWN SESSION ──
  state.status = 'running';
  state.progressPhase = 'executing';
  state.progressMessage = 'Starting CLI session...';

  const executionId = spawnV4Session(
    runId,
    projectPath,
    prompt,
    config,
    preFlightData.isNextJS,
  );

  state.executionId = executionId;

  // ── MONITOR (Gap 4: stream tool activity, Gap 5: track memory queries) ──
  const result = await monitorSession(executionId, {
    onProgress: (phase, pct, msg) => {
      state.progressPhase = phase;
      state.progress = pct;
      state.progressMessage = msg;
    },
    onToolActivity: (toolName, _input) => {
      // Gap 4: Real-time tool activity visible in UI
      state.progressMessage = `Using ${toolName.replace('mcp__vibeman__', '')}...`;
    },
  });

  // ── HANDLE RESULT ──
  if (result.completedNormally) {
    // Clean completion — run post-flight
    state.status = 'completing';
    state.progressPhase = 'post-flight';
    state.progressMessage = 'Processing results...';

    processPostFlight(runId, projectId, state.startedAt, state.goalId, result.memoryIdsQueried);

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.progress = 100;
    state.progressMessage = 'Pipeline completed successfully';
    activeRuns.delete(runId);

    logger.info(`[V4] Pipeline ${runId} completed successfully`);
  } else {
    // Abnormal exit — attempt auto-resume
    await handleAbnormalExit(state, config, projectPath, result);
  }
}

async function handleAbnormalExit(
  state: V4RunState,
  config: V4RunConfig,
  projectPath: string,
  result: import('./types').V4SessionResult,
): Promise<void> {
  const maxResumes = config.maxResumeAttempts ?? 3;

  if (state.resumeAttempts >= maxResumes) {
    // Max retries reached — finalize partial work
    logger.warn(`[V4] Max resume attempts (${maxResumes}) reached for run ${state.runId}`);
    processPostFlight(state.runId, state.projectId, state.startedAt, state.goalId);
    state.status = 'failed';
    conductorRepository.updateRunStatus(state.runId, 'failed');
    activeRuns.delete(state.runId);
    return;
  }

  // Rate limit — wait then resume
  if (isRateLimitError(result.error)) {
    logger.info(`[V4] Rate limited, waiting 60s before resume (attempt ${state.resumeAttempts + 1}/${maxResumes})`);
    state.progressMessage = 'Rate limited — waiting to resume...';
    await sleep(60000);
  } else {
    // Other error — short delay then resume
    logger.info(`[V4] Session interrupted, resuming (attempt ${state.resumeAttempts + 1}/${maxResumes})`);
    state.progressMessage = 'Session interrupted — resuming...';
    await sleep(5000);
  }

  state.resumeAttempts++;
  await resumeAndMonitor(state, config, projectPath);
}

async function resumeAndMonitor(
  state: V4RunState,
  config: V4RunConfig,
  projectPath: string,
): Promise<void> {
  state.status = 'running';
  state.progressPhase = 'resuming';

  const executionId = resumeV4Session(state.runId, projectPath, config);
  state.executionId = executionId;

  const result = await monitorSession(executionId, {
    onToolActivity: (toolName, _input) => {
      state.progressMessage = `Using ${toolName.replace('mcp__vibeman__', '')}...`;
    },
  });

  if (result.completedNormally) {
    state.status = 'completing';
    processPostFlight(state.runId, state.projectId, state.startedAt, state.goalId, result.memoryIdsQueried);
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.progress = 100;
    activeRuns.delete(state.runId);
    logger.info(`[V4] Pipeline ${state.runId} completed after resume`);
  } else {
    await handleAbnormalExit(state, config, projectPath, result);
  }
}

// ============================================================================
// Pre-Flight Data Gathering
// ============================================================================

function gatherPreFlightData(
  projectId: string,
  goalId: string,
  projectPath: string,
  projectName: string,
): V4PreFlightData {
  const db = getDatabase();

  // Goal
  const goal = db.prepare('SELECT id, title, description, context_id FROM goals WHERE id = ?').get(goalId) as {
    id: string; title: string; description: string | null; context_id: string | null;
  } | undefined;

  if (!goal) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  // Contexts — ALL if no contextId, focused if assigned
  let contexts: V4PreFlightData['contexts'];
  if (goal.context_id) {
    contexts = db.prepare(
      `SELECT c.id, c.name, c.description, c.file_paths, c.target, c.target_fulfillment, c.implemented_tasks,
              cg.name as group_name
       FROM contexts c LEFT JOIN context_groups cg ON c.group_id = cg.id
       WHERE c.id = ?`
    ).all(goal.context_id) as V4PreFlightData['contexts'];
  } else {
    contexts = db.prepare(
      `SELECT c.id, c.name, c.description, c.file_paths, c.target, c.target_fulfillment, c.implemented_tasks,
              cg.name as group_name
       FROM contexts c LEFT JOIN context_groups cg ON c.group_id = cg.id
       WHERE c.project_id = ?
       ORDER BY c.name`
    ).all(projectId) as V4PreFlightData['contexts'];
  }

  // Knowledge base — high confidence entries
  let knowledge: V4PreFlightData['knowledge'] = [];
  try {
    knowledge = db.prepare(
      `SELECT domain, layer, pattern_type, title, pattern, code_example, anti_pattern, confidence
       FROM knowledge_base_entries
       WHERE confidence >= 60
       ORDER BY confidence DESC, times_helpful DESC
       LIMIT 20`
    ).all() as V4PreFlightData['knowledge'];
  } catch { /* table may not exist */ }

  // Collective memory — effective approaches
  let memory: V4PreFlightData['memory'] = [];
  try {
    memory = db.prepare(
      `SELECT memory_type, title, description, code_pattern, effectiveness_score
       FROM collective_memory_entries
       WHERE project_id = ? AND effectiveness_score > 0.3
       ORDER BY effectiveness_score DESC
       LIMIT 10`
    ).all(projectId) as V4PreFlightData['memory'];
  } catch { /* table may not exist */ }

  // Brain insights — high confidence
  let insights: V4PreFlightData['insights'] = [];
  try {
    insights = db.prepare(
      `SELECT insight_type, title, description, confidence
       FROM brain_insights
       WHERE project_id = ? AND confidence >= 80
       ORDER BY confidence DESC
       LIMIT 10`
    ).all(projectId) as V4PreFlightData['insights'];
  } catch { /* table may not exist */ }

  // Existing ideas (avoid duplication)
  const existingIdeas = db.prepare(
    `SELECT id, title, status, category
     FROM ideas
     WHERE project_id = ? AND status IN ('pending', 'accepted')
     ORDER BY created_at DESC
     LIMIT 30`
  ).all(projectId) as V4PreFlightData['existingIdeas'];

  // Detect NextJS
  const isNextJS = detectNextJS(projectPath);

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      contextId: goal.context_id,
    },
    contexts,
    knowledge,
    memory,
    insights,
    existingIdeas,
    isNextJS,
    projectPath,
    projectName,
  };
}

function detectNextJS(projectPath: string): boolean {
  try {
    const fs = require('fs');
    const path = require('path');
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
    }
  } catch { /* ignore */ }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

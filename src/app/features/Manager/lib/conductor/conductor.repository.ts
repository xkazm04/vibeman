/**
 * Conductor Repository — DB access layer for pipeline runs
 *
 * Provides atomic CRUD operations for conductor_runs table.
 * Uses getDatabase() synchronous API matching project patterns.
 */

import { getDatabase } from '@/app/db/connection';
import type {
  PipelineStage,
  PipelineMetrics,
  PipelineRun,
  BalancingConfig,
  StageState,
  ErrorClassification,
  ProcessLogEntry,
} from './types';
import { createEmptyStages, createEmptyMetrics } from './types';

// ============================================================================
// HMR-safe global state
// ============================================================================

/** Typed extension of globalThis for conductor-specific singleton flags */
interface ConductorGlobalState {
  __conductorRecoveryDone?: boolean;
}
const conductorGlobal = globalThis as typeof globalThis & ConductorGlobalState;

// ============================================================================
// Types
// ============================================================================

/** Raw DB row shape for conductor_runs */
interface ConductorRunRow {
  id: string;
  project_id: string;
  goal_id: string | null;
  status: string;
  current_stage: string | null;
  cycle: number;
  config_snapshot: string | null;
  stages_state: string | null;
  metrics: string | null;
  process_log: string | null;
  should_abort: number;
  error_message: string | null;
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Parsed pipeline run from DB */
export interface DbPipelineRun {
  id: string;
  project_id: string;
  goal_id: string;
  status: string;
  current_stage: string | null;
  cycle: number;
  config: BalancingConfig | Record<string, unknown>;
  stages: Record<PipelineStage, StageState>;
  metrics: PipelineMetrics;
  process_log: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

function parseRunRow(row: ConductorRunRow): DbPipelineRun {
  let stages: Record<PipelineStage, StageState>;
  try {
    const parsed = JSON.parse(row.stages_state || '{}');
    stages = {
      scout: parsed.scout || { status: 'pending', itemsIn: 0, itemsOut: 0 },
      triage: parsed.triage || { status: 'pending', itemsIn: 0, itemsOut: 0 },
      batch: parsed.batch || { status: 'pending', itemsIn: 0, itemsOut: 0 },
      execute: parsed.execute || { status: 'pending', itemsIn: 0, itemsOut: 0 },
      review: parsed.review || { status: 'pending', itemsIn: 0, itemsOut: 0 },
    };
  } catch {
    stages = createEmptyStages();
  }

  let metrics: PipelineMetrics;
  try {
    metrics = { ...createEmptyMetrics(), ...JSON.parse(row.metrics || '{}') };
  } catch {
    metrics = createEmptyMetrics();
  }

  let config: BalancingConfig | Record<string, unknown>;
  try {
    config = JSON.parse(row.config_snapshot || '{}');
  } catch {
    config = {};
  }

  return {
    id: row.id,
    project_id: row.project_id,
    goal_id: row.goal_id || '',
    status: row.status,
    current_stage: row.current_stage,
    cycle: row.cycle,
    config,
    stages,
    metrics,
    process_log: row.process_log,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
  };
}

// ============================================================================
// Repository
// ============================================================================

export const conductorRepository = {
  /**
   * Create a new pipeline run in the DB with status='running'.
   */
  createRun(params: {
    id: string;
    projectId: string;
    goalId: string;
    config: BalancingConfig | Record<string, unknown>;
  }): DbPipelineRun {
    const db = getDatabase();
    const now = new Date().toISOString();
    const emptyStages = JSON.stringify(createEmptyStages());
    const emptyMetrics = JSON.stringify(createEmptyMetrics());
    const configSnapshot = JSON.stringify(params.config);

    db.prepare(`
      INSERT OR REPLACE INTO conductor_runs
        (id, project_id, goal_id, status, current_stage, cycle, config_snapshot, stages_state, metrics, started_at, created_at)
      VALUES (?, ?, ?, 'running', 'scout', 1, ?, ?, ?, ?, ?)
    `).run(
      params.id,
      params.projectId,
      params.goalId,
      configSnapshot,
      emptyStages,
      emptyMetrics,
      now,
      now,
    );

    return this.getRunById(params.id)!;
  },

  /**
   * Atomically update a stage's state and the current_stage column.
   * Uses db.transaction() to prevent partial writes.
   */
  completeStage(runId: string, stage: PipelineStage, stageState: StageState): void {
    const db = getDatabase();

    const txn = db.transaction(() => {
      const row = db.prepare(
        'SELECT stages_state FROM conductor_runs WHERE id = ?'
      ).get(runId) as { stages_state: string } | undefined;

      if (!row) return;

      let stages: Record<string, StageState>;
      try {
        stages = JSON.parse(row.stages_state || '{}');
      } catch {
        stages = {};
      }

      stages[stage] = stageState;

      db.prepare(
        'UPDATE conductor_runs SET stages_state = ?, current_stage = ? WHERE id = ?'
      ).run(JSON.stringify(stages), stage, runId);
    });

    txn();
  },

  /**
   * Update run status and optionally set completed_at and metrics.
   */
  updateRunStatus(runId: string, status: string, metrics?: PipelineMetrics): void {
    const db = getDatabase();

    if (metrics) {
      const completedAt = (status === 'completed' || status === 'failed' || status === 'interrupted')
        ? new Date().toISOString()
        : null;

      if (completedAt) {
        db.prepare(
          'UPDATE conductor_runs SET status = ?, metrics = ?, completed_at = ? WHERE id = ?'
        ).run(status, JSON.stringify(metrics), completedAt, runId);
      } else {
        db.prepare(
          'UPDATE conductor_runs SET status = ?, metrics = ? WHERE id = ?'
        ).run(status, JSON.stringify(metrics), runId);
      }
    } else {
      const completedAt = (status === 'completed' || status === 'failed' || status === 'interrupted')
        ? new Date().toISOString()
        : null;

      if (completedAt) {
        db.prepare(
          'UPDATE conductor_runs SET status = ?, completed_at = ? WHERE id = ?'
        ).run(status, completedAt, runId);
      } else {
        db.prepare('UPDATE conductor_runs SET status = ? WHERE id = ?').run(status, runId);
      }
    }
  },

  /**
   * Get a pipeline run by ID with all JSON fields parsed.
   */
  getRunById(runId: string): DbPipelineRun | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM conductor_runs WHERE id = ?').get(runId) as ConductorRunRow | undefined;
    if (!row) return null;
    return parseRunRow(row);
  },

  /**
   * Get run history for a project, ordered by started_at DESC.
   */
  getRunHistory(projectId: string, limit: number = 20): DbPipelineRun[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM conductor_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT ?'
    ).all(projectId, limit) as ConductorRunRow[];

    return rows.map(parseRunRow);
  },

  /**
   * Mark all running/paused runs as interrupted (startup recovery).
   * Uses globalThis guard to prevent HMR re-triggering.
   * Returns the number of runs marked.
   */
  markInterruptedRuns(): number {
    if (conductorGlobal.__conductorRecoveryDone) return 0;

    const db = getDatabase();
    const now = new Date().toISOString();
    const result = db.prepare(
      "UPDATE conductor_runs SET status = 'interrupted', completed_at = ? WHERE status IN ('running', 'paused')"
    ).run(now);

    conductorGlobal.__conductorRecoveryDone = true;
    return result.changes;
  },

  /**
   * Check if a run should be aborted.
   */
  checkAbort(runId: string): boolean {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT should_abort FROM conductor_runs WHERE id = ?'
    ).get(runId) as { should_abort: number } | undefined;

    return row?.should_abort === 1;
  },

  /**
   * Set the abort flag for a run.
   */
  setAbort(runId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE conductor_runs SET should_abort = 1 WHERE id = ?').run(runId);
  },

  /**
   * Save a compact classification summary on the run record.
   * Stores a JSON array of { errorType, count, stage } objects.
   */
  saveClassificationsOnRun(runId: string, classifications: ErrorClassification[]): void {
    const db = getDatabase();
    const summary = classifications.map((c) => ({
      errorType: c.errorType,
      count: c.occurrenceCount,
      stage: c.stage,
    }));
    db.prepare(
      'UPDATE conductor_runs SET error_classifications = ? WHERE id = ?'
    ).run(JSON.stringify(summary), runId);
  },

  /**
   * Get retry count for a specific error type in a run (optionally filtered by taskId).
   * Counts matching rows in conductor_errors.
   */
  getRetryCount(runId: string, errorType: string, taskId?: string): number {
    const db = getDatabase();
    if (taskId) {
      const row = db.prepare(
        'SELECT COUNT(*) as cnt FROM conductor_errors WHERE pipeline_run_id = ? AND error_type = ? AND task_id = ?'
      ).get(runId, errorType, taskId) as { cnt: number };
      return row.cnt;
    }
    const row = db.prepare(
      'SELECT COUNT(*) as cnt FROM conductor_errors WHERE pipeline_run_id = ? AND error_type = ?'
    ).get(runId, errorType) as { cnt: number };
    return row.cnt;
  },

  /**
   * Persist full pipeline state atomically for crash recovery.
   * Saves metrics, stages, process_log, and cycle in one transaction.
   */
  persistFullState(runId: string, state: {
    metrics: PipelineMetrics;
    stages: Record<PipelineStage, StageState>;
    processLog: ProcessLogEntry[];
    cycle: number;
    currentStage: PipelineStage;
  }): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE conductor_runs
      SET metrics = ?, stages_state = ?, process_log = ?, cycle = ?, current_stage = ?
      WHERE id = ?
    `).run(
      JSON.stringify(state.metrics),
      JSON.stringify(state.stages),
      JSON.stringify(state.processLog),
      state.cycle,
      state.currentStage,
      runId
    );
  },

  /**
   * Record or increment a retry for a specific error type/task in a run.
   * Uses INSERT OR REPLACE to upsert matching rows.
   */
  incrementRetryCount(runId: string, errorType: string, taskId: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare(
      'SELECT id, occurrence_count FROM conductor_errors WHERE pipeline_run_id = ? AND error_type = ? AND task_id = ?'
    ).get(runId, errorType, taskId) as { id: string; occurrence_count: number } | undefined;

    if (existing) {
      db.prepare(
        'UPDATE conductor_errors SET occurrence_count = occurrence_count + 1, last_seen = ? WHERE id = ?'
      ).run(now, existing.id);
    } else {
      const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(`
        INSERT INTO conductor_errors
        (id, pipeline_run_id, stage, error_type, error_message, task_id, occurrence_count, first_seen, last_seen, resolved)
        VALUES (?, ?, 'execute', ?, '', ?, 1, ?, ?, 0)
      `).run(id, runId, errorType, taskId, now, now);
    }
  },
};

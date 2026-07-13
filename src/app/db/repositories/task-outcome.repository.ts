/**
 * Task Outcome Repository
 *
 * Durable per-task execution outcome (migration 237). One row per task_id (the
 * stable requirement name); a retry upserts the latest outcome. Persists the
 * final status, duration, the files the task touched, and a short summary so the
 * TaskRunner post-completion panel can show "what changed" long after the live
 * in-memory execution + terminal events have been garbage-collected — surviving
 * page reloads and server restarts.
 */

import { getDatabase } from '../connection';

export type TaskOutcomeStatus = 'completed' | 'failed' | 'session-limit';

export interface DbTaskOutcomeRow {
  task_id: string;
  project_id: string | null;
  project_path: string | null;
  requirement_name: string;
  status: string;
  duration_ms: number | null;
  changed_files: string; // JSON-encoded string[]
  summary: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

/** Decoded outcome as consumed by API/UI (changed_files parsed to an array). */
export interface TaskOutcome {
  taskId: string;
  projectId: string | null;
  projectPath: string | null;
  requirementName: string;
  status: TaskOutcomeStatus | string;
  durationMs: number | null;
  changedFiles: string[];
  summary: string | null;
  provider: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordTaskOutcomeInput {
  taskId: string;
  projectId?: string | null;
  projectPath?: string | null;
  requirementName: string;
  status: TaskOutcomeStatus;
  durationMs?: number | null;
  changedFiles?: string[];
  summary?: string | null;
  provider?: string | null;
  model?: string | null;
}

/** Trim a summary to a sane persisted length. */
function clampSummary(summary?: string | null): string | null {
  if (!summary) return null;
  const trimmed = summary.trim();
  if (!trimmed) return null;
  return trimmed.length > 500 ? `${trimmed.slice(0, 497)}...` : trimmed;
}

function decodeRow(row: DbTaskOutcomeRow): TaskOutcome {
  let changedFiles: string[] = [];
  try {
    const parsed = JSON.parse(row.changed_files);
    if (Array.isArray(parsed)) changedFiles = parsed.filter((f): f is string => typeof f === 'string');
  } catch {
    changedFiles = [];
  }
  return {
    taskId: row.task_id,
    projectId: row.project_id,
    projectPath: row.project_path,
    requirementName: row.requirement_name,
    status: row.status,
    durationMs: row.duration_ms,
    changedFiles,
    summary: row.summary,
    provider: row.provider,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const taskOutcomeRepository = {
  /**
   * Insert or replace the outcome for a task (keyed by task_id). Preserves the
   * original created_at on update so the panel can show first-run time.
   */
  record(input: RecordTaskOutcomeInput): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO task_outcomes (
        task_id, project_id, project_path, requirement_name, status,
        duration_ms, changed_files, summary, provider, model, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id) DO UPDATE SET
        project_id = excluded.project_id,
        project_path = excluded.project_path,
        requirement_name = excluded.requirement_name,
        status = excluded.status,
        duration_ms = excluded.duration_ms,
        changed_files = excluded.changed_files,
        summary = excluded.summary,
        provider = excluded.provider,
        model = excluded.model,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      input.taskId,
      input.projectId ?? null,
      input.projectPath ?? null,
      input.requirementName,
      input.status,
      input.durationMs ?? null,
      JSON.stringify(input.changedFiles ?? []),
      clampSummary(input.summary),
      input.provider ?? null,
      input.model ?? null,
      now,
      now
    );
  },

  getByTaskId(taskId: string): TaskOutcome | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM task_outcomes WHERE task_id = ?').get(taskId) as DbTaskOutcomeRow | undefined;
    return row ? decodeRow(row) : null;
  },

  listByProjectId(projectId: string): TaskOutcome[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM task_outcomes WHERE project_id = ? ORDER BY updated_at DESC'
    ).all(projectId) as DbTaskOutcomeRow[];
    return rows.map(decodeRow);
  },

  listByProjectPath(projectPath: string): TaskOutcome[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM task_outcomes WHERE project_path = ? ORDER BY updated_at DESC'
    ).all(projectPath) as DbTaskOutcomeRow[];
    return rows.map(decodeRow);
  },

  delete(taskId: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM task_outcomes WHERE task_id = ?').run(taskId) as { changes: number };
    return result.changes > 0;
  },
};

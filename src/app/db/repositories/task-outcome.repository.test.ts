import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { taskOutcomeRepository } from './task-outcome.repository';
import { getDatabase } from '../connection';

// Tests run against the shared dev DB via getDatabase(); migrations are not run
// by the vitest harness, so ensure the migration-237 table exists idempotently
// (identical DDL to src/app/db/migrations/237_task_outcomes.ts).
beforeAll(() => {
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS task_outcomes (
      task_id TEXT PRIMARY KEY,
      project_id TEXT,
      project_path TEXT,
      requirement_name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER,
      changed_files TEXT NOT NULL DEFAULT '[]',
      summary TEXT,
      provider TEXT,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
});

/**
 * Migration 237 — persisted per-task outcomes. Verifies the record/read path the
 * TaskRunner post-completion panel depends on: files touched, status, duration,
 * and summary survive a round-trip, and a retry upserts (not duplicates).
 */
describe('taskOutcomeRepository', () => {
  const createdTaskIds: string[] = [];

  function makeId(): string {
    const id = `test-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdTaskIds.push(id);
    return id;
  }

  afterEach(() => {
    const db = getDatabase();
    for (const id of createdTaskIds) {
      try {
        db.prepare('DELETE FROM task_outcomes WHERE task_id = ?').run(id);
      } catch {
        // ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;
  });

  it('records and reads back a completed outcome including changed files', () => {
    const taskId = makeId();
    taskOutcomeRepository.record({
      taskId,
      projectId: 'proj-1',
      projectPath: '/tmp/proj-1',
      requirementName: 'Add feature X',
      status: 'completed',
      durationMs: 42000,
      changedFiles: ['src/a.ts', 'src/b.ts'],
      summary: 'Implemented feature X across two files',
      provider: 'claude',
      model: 'opus',
    });

    const outcome = taskOutcomeRepository.getByTaskId(taskId);
    expect(outcome).not.toBeNull();
    expect(outcome!.status).toBe('completed');
    expect(outcome!.durationMs).toBe(42000);
    expect(outcome!.changedFiles).toEqual(['src/a.ts', 'src/b.ts']);
    expect(outcome!.summary).toBe('Implemented feature X across two files');
    expect(outcome!.provider).toBe('claude');
    expect(outcome!.requirementName).toBe('Add feature X');
  });

  it('defaults changed files to an empty array when none provided', () => {
    const taskId = makeId();
    taskOutcomeRepository.record({
      taskId,
      projectId: 'proj-2',
      requirementName: 'Failing task',
      status: 'failed',
      summary: 'Boom',
    });

    const outcome = taskOutcomeRepository.getByTaskId(taskId);
    expect(outcome!.changedFiles).toEqual([]);
    expect(outcome!.status).toBe('failed');
    expect(outcome!.durationMs).toBeNull();
  });

  it('upserts on retry rather than duplicating (keyed by task_id)', () => {
    const taskId = makeId();
    taskOutcomeRepository.record({
      taskId,
      projectId: 'proj-3',
      requirementName: 'Retry me',
      status: 'failed',
      changedFiles: [],
      summary: 'first attempt failed',
    });
    taskOutcomeRepository.record({
      taskId,
      projectId: 'proj-3',
      requirementName: 'Retry me',
      status: 'completed',
      changedFiles: ['src/fixed.ts'],
      summary: 'second attempt succeeded',
    });

    const list = taskOutcomeRepository.listByProjectId('proj-3').filter((o) => o.taskId === taskId);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('completed');
    expect(list[0].changedFiles).toEqual(['src/fixed.ts']);
  });

  it('lists outcomes by project id and by project path', () => {
    const taskId = makeId();
    taskOutcomeRepository.record({
      taskId,
      projectId: 'proj-4',
      projectPath: '/tmp/proj-4',
      requirementName: 'Scoped task',
      status: 'completed',
      changedFiles: ['x.ts'],
    });

    expect(taskOutcomeRepository.listByProjectId('proj-4').some((o) => o.taskId === taskId)).toBe(true);
    expect(taskOutcomeRepository.listByProjectPath('/tmp/proj-4').some((o) => o.taskId === taskId)).toBe(true);
  });

  it('clamps an oversized summary', () => {
    const taskId = makeId();
    taskOutcomeRepository.record({
      taskId,
      requirementName: 'Long summary',
      status: 'completed',
      summary: 'x'.repeat(1000),
    });
    const outcome = taskOutcomeRepository.getByTaskId(taskId);
    expect(outcome!.summary!.length).toBeLessThanOrEqual(500);
    expect(outcome!.summary!.endsWith('...')).toBe(true);
  });
});

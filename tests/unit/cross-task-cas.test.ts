/**
 * Repository CAS tests for cross_task_plans (manager #3, fixed 2026-06-19).
 *
 * completePlan must only complete a 'running' plan (a duplicate/late callback must not
 * overwrite the first result); selectPlan must only write a selection on a 'completed'
 * plan. Exercised through the real repository against an in-memory DB injected via the
 * connection test hook.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { crossTaskPlanRepository } from '@/app/db/repositories/cross-task.repository';

let db: Database.Database;

function createSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS cross_task_plans (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_ids TEXT NOT NULL,
      requirement TEXT NOT NULL,
      requirement_summary TEXT,
      prompt_used TEXT,
      plan_option_1 TEXT, plan_option_1_title TEXT,
      plan_option_2 TEXT, plan_option_2_title TEXT,
      plan_option_3 TEXT, plan_option_3_title TEXT,
      current_flow_analysis TEXT,
      selected_plan INTEGER,
      user_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      execution_id TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function insertPlan(id: string, status: string) {
  db.prepare(
    `INSERT INTO cross_task_plans (id, project_ids, requirement, status) VALUES (?, '["p1"]', 'req', ?)`
  ).run(id, status);
}

const completeResults = {
  requirement_summary: 'FIRST',
  current_flow_analysis: 'flow',
  plan_option_1: 'a', plan_option_1_title: 'A',
  plan_option_2: 'b', plan_option_2_title: 'B',
  plan_option_3: 'c', plan_option_3_title: 'C',
};

beforeEach(() => {
  db = new Database(':memory:');
  createSchema(db);
  __setTestDatabase(db);
});

afterEach(() => {
  __setTestDatabase(null);
  db.close();
});

describe('crossTaskPlanRepository.completePlan (CAS on running)', () => {
  it('completes a running plan and does not let a second callback overwrite it', () => {
    insertPlan('plan1', 'running');

    const first = crossTaskPlanRepository.completePlan('plan1', completeResults);
    expect(first?.status).toBe('completed');
    expect(first?.requirement_summary).toBe('FIRST');

    // Duplicate/late callback with different content — must NOT overwrite.
    crossTaskPlanRepository.completePlan('plan1', { ...completeResults, requirement_summary: 'SECOND' });
    const after = crossTaskPlanRepository.getById('plan1');
    expect(after?.status).toBe('completed');
    expect(after?.requirement_summary).toBe('FIRST');
  });

  it('does not complete a plan that is not running', () => {
    insertPlan('plan2', 'pending');
    crossTaskPlanRepository.completePlan('plan2', completeResults);
    const after = crossTaskPlanRepository.getById('plan2');
    expect(after?.status).toBe('pending');
    expect(after?.requirement_summary ?? null).toBeNull();
  });
});

describe('crossTaskPlanRepository.selectPlan (CAS on completed)', () => {
  it('selects a plan option only when the plan is completed', () => {
    insertPlan('plan3', 'completed');
    crossTaskPlanRepository.selectPlan('plan3', 2, 'note');
    expect(crossTaskPlanRepository.getById('plan3')?.selected_plan).toBe(2);
  });

  it('ignores a selection on a non-completed plan', () => {
    insertPlan('plan4', 'running');
    crossTaskPlanRepository.selectPlan('plan4', 1);
    expect(crossTaskPlanRepository.getById('plan4')?.selected_plan ?? null).toBeNull();
  });
});

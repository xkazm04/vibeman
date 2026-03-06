/**
 * Scan Profile Repository
 * CRUD operations for goal-driven scan profiles
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, generateId } from './repository.utils';
import { createGenericRepository } from './generic.repository';

export interface DbScanProfile {
  id: string;
  project_id: string;
  goal_id: string | null;
  name: string;
  description: string | null;
  scan_types: string; // JSON array of ScanType[]
  context_ids: string | null; // JSON array of context IDs
  group_ids: string | null; // JSON array of group IDs
  prompt_overrides: string | null; // JSON object of overrides
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateScanProfileInput {
  projectId: string;
  goalId?: string;
  name: string;
  description?: string;
  scanTypes: string[];
  contextIds?: string[];
  groupIds?: string[];
  promptOverrides?: Record<string, string>;
}

export interface UpdateScanProfileInput {
  name?: string;
  description?: string;
  scanTypes?: string[];
  contextIds?: string[];
  groupIds?: string[];
  promptOverrides?: Record<string, string>;
}

const base = createGenericRepository<DbScanProfile>({
  tableName: 'scan_profiles',
  defaultOrder: 'updated_at DESC',
});

export const scanProfileRepository = {
  create(input: CreateScanProfileInput): DbScanProfile {
    const db = getDatabase();
    const id = generateId('sp');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO scan_profiles (id, project_id, goal_id, name, description, scan_types, context_ids, group_ids, prompt_overrides, run_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      input.goalId || null,
      input.name,
      input.description || null,
      JSON.stringify(input.scanTypes),
      input.contextIds ? JSON.stringify(input.contextIds) : null,
      input.groupIds ? JSON.stringify(input.groupIds) : null,
      input.promptOverrides ? JSON.stringify(input.promptOverrides) : null,
      now,
      now,
    );

    return base.getById(id)!;
  },

  getById(id: string): DbScanProfile | undefined {
    return base.getById(id) ?? undefined;
  },

  getByProject(projectId: string): DbScanProfile[] {
    return base.getByProject(projectId);
  },

  getByGoal(goalId: string): DbScanProfile[] {
    const db = getDatabase();
    return db.prepare(
      'SELECT * FROM scan_profiles WHERE goal_id = ? ORDER BY updated_at DESC',
    ).all(goalId) as DbScanProfile[];
  },

  update(id: string, input: UpdateScanProfileInput): DbScanProfile | undefined {
    const dbUpdates: Record<string, unknown> = {};
    if (input.name !== undefined) dbUpdates.name = input.name;
    if (input.description !== undefined) dbUpdates.description = input.description;
    if (input.scanTypes !== undefined) dbUpdates.scan_types = JSON.stringify(input.scanTypes);
    if (input.contextIds !== undefined) dbUpdates.context_ids = JSON.stringify(input.contextIds);
    if (input.groupIds !== undefined) dbUpdates.group_ids = JSON.stringify(input.groupIds);
    if (input.promptOverrides !== undefined) dbUpdates.prompt_overrides = JSON.stringify(input.promptOverrides);
    return base.update(id, dbUpdates) ?? undefined;
  },

  recordRun(id: string): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(
      'UPDATE scan_profiles SET last_run_at = ?, run_count = run_count + 1, updated_at = ? WHERE id = ?',
    ).run(now, now, id);
  },

  delete(id: string): boolean {
    return base.deleteById(id);
  },
};

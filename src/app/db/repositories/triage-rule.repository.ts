import { getDatabase } from '../connection';
import { DbTriageRule } from '../models/types';
import { getCurrentTimestamp, selectOne } from './repository.utils';

/**
 * Triage Rule Repository
 * Handles CRUD operations for auto-triage rules (auto-accept, auto-reject, auto-archive)
 */
export const triageRuleRepository = {
  /**
   * Get all rules, ordered by priority (highest first)
   */
  getAllRules: (): DbTriageRule[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM triage_rules
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all() as DbTriageRule[];
  },

  /**
   * Get enabled rules for a project (includes global rules where project_id IS NULL)
   */
  getEnabledRulesForProject: (projectId: string): DbTriageRule[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM triage_rules
      WHERE enabled = 1 AND (project_id = ? OR project_id IS NULL)
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(projectId) as DbTriageRule[];
  },

  /**
   * Get all enabled rules (cross-project)
   */
  getEnabledRules: (): DbTriageRule[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM triage_rules
      WHERE enabled = 1
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all() as DbTriageRule[];
  },

  /**
   * Get rules by project
   */
  getRulesByProject: (projectId: string): DbTriageRule[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM triage_rules
      WHERE project_id = ? OR project_id IS NULL
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(projectId) as DbTriageRule[];
  },

  /**
   * Get a single rule by ID
   */
  getRuleById: (ruleId: string): DbTriageRule | null => {
    const db = getDatabase();
    return selectOne<DbTriageRule>(db, 'SELECT * FROM triage_rules WHERE id = ?', ruleId);
  },

  /**
   * Create a new triage rule
   */
  createRule: (rule: {
    id: string;
    project_id?: string | null;
    name: string;
    description?: string | null;
    action: 'accept' | 'reject' | 'archive';
    conditions: string; // JSON string
    enabled?: boolean;
    priority?: number;
  }): DbTriageRule => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO triage_rules (id, project_id, name, description, action, conditions, enabled, priority, times_fired, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      rule.id,
      rule.project_id ?? null,
      rule.name,
      rule.description ?? null,
      rule.action,
      rule.conditions,
      rule.enabled !== false ? 1 : 0,
      rule.priority ?? 0,
      now,
      now
    );

    return selectOne<DbTriageRule>(db, 'SELECT * FROM triage_rules WHERE id = ?', rule.id)!;
  },

  /**
   * Update a triage rule
   */
  updateRule: (id: string, updates: {
    name?: string;
    description?: string | null;
    action?: 'accept' | 'reject' | 'archive';
    conditions?: string;
    enabled?: boolean;
    priority?: number;
  }): DbTriageRule | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.action !== undefined) { fields.push('action = ?'); values.push(updates.action); }
    if (updates.conditions !== undefined) { fields.push('conditions = ?'); values.push(updates.conditions); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority); }

    if (fields.length === 0) {
      return selectOne<DbTriageRule>(db, 'SELECT * FROM triage_rules WHERE id = ?', id);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`UPDATE triage_rules SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    if (result.changes === 0) return null;

    return selectOne<DbTriageRule>(db, 'SELECT * FROM triage_rules WHERE id = ?', id);
  },

  /**
   * Delete a triage rule
   */
  deleteRule: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM triage_rules WHERE id = ?');
    return stmt.run(id).changes > 0;
  },

  /**
   * Increment the times_fired counter and set last_fired_at
   */
  recordFiring: (id: string, count: number): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE triage_rules
      SET times_fired = times_fired + ?, last_fired_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(count, now, now, id);
  },
};

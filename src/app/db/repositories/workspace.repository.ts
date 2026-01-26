/**
 * Workspace Repository
 * Handles all database operations for workspace-based project grouping
 */

import { getDatabase } from '../connection';
import { DbWorkspace, DbWorkspaceProject } from '../models/types';
import { generateId, getCurrentTimestamp } from './repository.utils';

let tablesEnsured = false;

function ensureTables(): void {
  if (tablesEnsured) return;
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'folder',
      base_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workspace_projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL UNIQUE,
      position INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_workspaces_position ON workspaces(position);
    CREATE INDEX IF NOT EXISTS idx_workspace_projects_workspace ON workspace_projects(workspace_id);
  `);
  tablesEnsured = true;
}

export const workspaceRepository = {
  /**
   * Get all workspaces ordered by position
   */
  getAll: (): DbWorkspace[] => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM workspaces
      ORDER BY position, created_at
    `);
    return stmt.all() as DbWorkspace[];
  },

  /**
   * Get workspace by ID
   */
  getById: (id: string): DbWorkspace | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?');
    const result = stmt.get(id) as DbWorkspace | undefined;
    return result || null;
  },

  /**
   * Create a new workspace
   */
  create: (
    data: Omit<DbWorkspace, 'id' | 'created_at' | 'updated_at'>
  ): DbWorkspace => {
    const db = getDatabase();
    const id = generateId('ws');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, description, color, icon, base_path, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.description, data.color, data.icon, data.base_path || null, data.position, now, now);
    return workspaceRepository.getById(id)!;
  },

  /**
   * Update a workspace
   */
  update: (
    id: string,
    updates: Partial<Omit<DbWorkspace, 'id' | 'created_at'>>
  ): DbWorkspace | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      updateFields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.base_path !== undefined) {
      updateFields.push('base_path = ?');
      values.push(updates.base_path);
    }
    if (updates.position !== undefined) {
      updateFields.push('position = ?');
      values.push(updates.position);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE workspaces
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return workspaceRepository.getById(id);
  },

  /**
   * Delete a workspace (projects become unassigned, not deleted)
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    // CASCADE will remove workspace_projects rows
    const stmt = db.prepare('DELETE FROM workspaces WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get project IDs assigned to a workspace
   */
  getProjectIds: (workspaceId: string): string[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT project_id FROM workspace_projects
      WHERE workspace_id = ?
      ORDER BY position
    `);
    const rows = stmt.all(workspaceId) as Array<{ project_id: string }>;
    return rows.map(r => r.project_id);
  },

  /**
   * Get workspace for a specific project (or null if unassigned)
   */
  getWorkspaceForProject: (projectId: string): DbWorkspace | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT w.* FROM workspaces w
      JOIN workspace_projects wp ON wp.workspace_id = w.id
      WHERE wp.project_id = ?
    `);
    const result = stmt.get(projectId) as DbWorkspace | undefined;
    return result || null;
  },

  /**
   * Add a project to a workspace (removes from previous workspace if any)
   */
  addProject: (workspaceId: string, projectId: string): void => {
    const db = getDatabase();
    // Remove from any existing workspace first (one-workspace-per-project)
    db.prepare('DELETE FROM workspace_projects WHERE project_id = ?').run(projectId);

    // Get next position
    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos
      FROM workspace_projects WHERE workspace_id = ?
    `).get(workspaceId) as { max_pos: number };

    const id = generateId('wp');
    const stmt = db.prepare(`
      INSERT INTO workspace_projects (id, workspace_id, project_id, position, added_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, workspaceId, projectId, maxPos.max_pos + 1);
  },

  /**
   * Remove a project from a workspace (becomes unassigned/Default)
   */
  removeProject: (workspaceId: string, projectId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM workspace_projects
      WHERE workspace_id = ? AND project_id = ?
    `);
    const result = stmt.run(workspaceId, projectId);
    return result.changes > 0;
  },

  /**
   * Replace all project assignments for a workspace
   */
  setProjects: (workspaceId: string, projectIds: string[]): void => {
    const db = getDatabase();

    const transaction = db.transaction(() => {
      // Remove all current assignments for this workspace
      db.prepare('DELETE FROM workspace_projects WHERE workspace_id = ?').run(workspaceId);

      // Also remove these projects from any other workspace (one-per-project)
      if (projectIds.length > 0) {
        const placeholders = projectIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM workspace_projects WHERE project_id IN (${placeholders})`).run(...projectIds);
      }

      // Insert new assignments
      const insertStmt = db.prepare(`
        INSERT INTO workspace_projects (id, workspace_id, project_id, position, added_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      projectIds.forEach((projectId, index) => {
        const id = generateId('wp');
        insertStmt.run(id, workspaceId, projectId, index);
      });
    });

    transaction();
  },

  /**
   * Get project IDs not assigned to any workspace (Default workspace)
   */
  getUnassignedProjectIds: (allProjectIds: string[]): string[] => {
    if (allProjectIds.length === 0) return [];
    const db = getDatabase();
    const stmt = db.prepare('SELECT project_id FROM workspace_projects');
    const assigned = new Set(
      (stmt.all() as Array<{ project_id: string }>).map(r => r.project_id)
    );
    return allProjectIds.filter(id => !assigned.has(id));
  },

  /**
   * Get all workspace-project mappings (bulk load for store)
   */
  getAllMappings: (): Record<string, string[]> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT workspace_id, project_id FROM workspace_projects
      ORDER BY workspace_id, position
    `);
    const rows = stmt.all() as Array<{ workspace_id: string; project_id: string }>;

    const map: Record<string, string[]> = {};
    for (const row of rows) {
      if (!map[row.workspace_id]) map[row.workspace_id] = [];
      map[row.workspace_id].push(row.project_id);
    }
    return map;
  },
};

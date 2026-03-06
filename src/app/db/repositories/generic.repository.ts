/**
 * GenericRepository — reusable CRUD factory for SQLite-backed repositories.
 *
 * Eliminates the 30-40% boilerplate shared across 50+ repository files:
 *   getById, getByProject, update (dynamic SET via buildUpdateQuery),
 *   deleteById, deleteByProject.
 *
 * Repositories call `createGenericRepository(config)` and get standard methods
 * back. They only need to implement their own JOIN queries, batch operations,
 * or domain-specific logic alongside the generic methods.
 *
 * Usage:
 * ```ts
 * const base = createGenericRepository<DbGoal>({
 *   tableName: 'goals',
 * });
 *
 * export const goalRepository = {
 *   ...base,
 *   // custom methods that need JOINs, aggregations, etc.
 *   getGoalsByProject: (projectId: string) => { ... },
 * };
 * ```
 */

import type { Database } from 'better-sqlite3';
import { getDatabase } from '../connection';
import {
  buildUpdateQuery,
  getCurrentTimestamp,
  selectOne,
  selectAll,
  type TableName,
} from './repository.utils';

export interface GenericRepositoryConfig {
  /** Table name — must exist in VALID_TABLE_NAMES whitelist */
  tableName: TableName;

  /** Primary key column (default: 'id') */
  idField?: string;

  /** Project foreign key column (default: 'project_id'). Set to null to disable project-scoped methods. */
  projectIdField?: string | null;

  /** Fields to exclude from dynamic updates (default: ['id', 'created_at']) */
  excludeUpdateFields?: string[];

  /** Default ORDER BY for getByProject (default: 'created_at DESC') */
  defaultOrder?: string;

  /** Override the database getter (e.g. for hot-writes DB) */
  getDb?: () => Database;
}

export interface GenericRepository<T> {
  /** Get a single record by primary key */
  getById: (id: string) => T | null;

  /** Get all records for a project, ordered by defaultOrder */
  getByProject: (projectId: string, limit?: number) => T[];

  /** Get all records for multiple projects in a single query */
  getByProjects: (projectIds: string[], limit?: number) => T[];

  /** Dynamic UPDATE using buildUpdateQuery. Returns updated record or null. */
  update: (id: string, updates: Record<string, unknown>) => T | null;

  /** Delete a single record by primary key */
  deleteById: (id: string) => boolean;

  /** Delete all records for a project */
  deleteByProject: (projectId: string) => number;

  /** Count records for a project */
  countByProject: (projectId: string) => number;
}

export function createGenericRepository<T>(
  config: GenericRepositoryConfig,
): GenericRepository<T> {
  const {
    tableName,
    idField = 'id',
    projectIdField = 'project_id',
    excludeUpdateFields = ['id', 'created_at'],
    defaultOrder = 'created_at DESC',
    getDb = getDatabase,
  } = config;

  return {
    getById(id: string): T | null {
      const db = getDb();
      return selectOne<T>(db, `SELECT * FROM ${tableName} WHERE ${idField} = ?`, id);
    },

    getByProject(projectId: string, limit?: number): T[] {
      if (!projectIdField) return [];
      const db = getDb();
      const limitClause = limit ? ' LIMIT ?' : '';
      const params: unknown[] = [projectId];
      if (limit) params.push(limit);
      return selectAll<T>(
        db,
        `SELECT * FROM ${tableName} WHERE ${projectIdField} = ? ORDER BY ${defaultOrder}${limitClause}`,
        ...params,
      );
    },

    getByProjects(projectIds: string[], limit?: number): T[] {
      if (!projectIdField || projectIds.length === 0) return [];
      if (projectIds.length === 1) return this.getByProject(projectIds[0], limit);

      const db = getDb();
      const placeholders = projectIds.map(() => '?').join(', ');
      const limitClause = limit ? ' LIMIT ?' : '';
      const params: unknown[] = [...projectIds];
      if (limit) params.push(limit);
      return selectAll<T>(
        db,
        `SELECT * FROM ${tableName} WHERE ${projectIdField} IN (${placeholders}) ORDER BY ${defaultOrder}${limitClause}`,
        ...params,
      );
    },

    update(id: string, updates: Record<string, unknown>): T | null {
      const db = getDb();
      const { fields, values } = buildUpdateQuery(updates, excludeUpdateFields);

      if (fields.length === 0) {
        return selectOne<T>(db, `SELECT * FROM ${tableName} WHERE ${idField} = ?`, id);
      }

      const now = getCurrentTimestamp();
      fields.push('updated_at = ?');
      values.push(now);
      values.push(id);

      const stmt = db.prepare(
        `UPDATE ${tableName} SET ${fields.join(', ')} WHERE ${idField} = ?`,
      );
      const result = stmt.run(...values);

      if (result.changes === 0) return null;

      return selectOne<T>(db, `SELECT * FROM ${tableName} WHERE ${idField} = ?`, id);
    },

    deleteById(id: string): boolean {
      const db = getDb();
      const result = db.prepare(`DELETE FROM ${tableName} WHERE ${idField} = ?`).run(id);
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      if (!projectIdField) return 0;
      const db = getDb();
      const result = db
        .prepare(`DELETE FROM ${tableName} WHERE ${projectIdField} = ?`)
        .run(projectId);
      return result.changes;
    },

    countByProject(projectId: string): number {
      if (!projectIdField) return 0;
      const db = getDb();
      const row = selectOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM ${tableName} WHERE ${projectIdField} = ?`,
        projectId,
      );
      return row?.count ?? 0;
    },
  };
}

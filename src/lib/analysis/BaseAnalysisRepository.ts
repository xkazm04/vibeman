/**
 * BaseAnalysisRepository
 *
 * Extracts the shared lifecycle operations (create → start → complete/fail)
 * from executive-analysis.repository and architecture-analysis.repository.
 *
 * Concrete repositories provide:
 *  - tableName
 *  - buildCreateParams / buildCompleteParams (column-specific SQL)
 *
 * Everything else (getById, startAnalysis, failAnalysis, delete, getHistory) is shared.
 */

import { getDatabase } from '@/app/db/connection';
import { getCurrentTimestamp, selectOne, selectAll } from '@/app/db/repositories/repository.utils';
import type { BaseAnalysisRecord } from './types';

export interface BaseRepoConfig<
  TRecord extends BaseAnalysisRecord,
  TCreateInput,
  TCompleteData,
> {
  /** SQL table name */
  tableName: string;

  /**
   * Return the INSERT column list and matching positional params.
   * e.g. { columns: 'id, project_id, status, created_at', values: '?, ?, ?, ?', params: [...] }
   */
  buildCreateSql(input: TCreateInput, now: string): {
    columns: string;
    placeholders: string;
    params: unknown[];
  };

  /**
   * Return SET clause and params for the completion UPDATE.
   * Must NOT include status or completed_at – those are added automatically.
   */
  buildCompleteSql(data: TCompleteData, now: string): {
    setClause: string;
    params: unknown[];
  };

  /**
   * Optional: extra SET clause additions for startAnalysis beyond status/started_at.
   * e.g. architecture adds execution_id.
   */
  buildStartExtras?: (...args: unknown[]) => {
    setClause: string;
    whereExtra: string;
    params: unknown[];
  };
}

export function createBaseAnalysisRepository<
  TRecord extends BaseAnalysisRecord,
  TCreateInput,
  TCompleteData,
>(config: BaseRepoConfig<TRecord, TCreateInput, TCompleteData>) {
  const { tableName } = config;

  return {
    getById(id: string): TRecord | null {
      const db = getDatabase();
      return selectOne<TRecord>(db, `SELECT * FROM ${tableName} WHERE id = ?`, id);
    },

    create(input: TCreateInput): TRecord {
      const db = getDatabase();
      const now = getCurrentTimestamp();
      const { columns, placeholders, params } = config.buildCreateSql(input, now);

      db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`).run(...params);

      return selectOne<TRecord>(db, `SELECT * FROM ${tableName} WHERE id = ?`, params[0] as string)!;
    },

    startAnalysis(id: string, ...extraArgs: unknown[]): TRecord | null {
      const db = getDatabase();
      const now = getCurrentTimestamp();

      if (config.buildStartExtras) {
        const extras = config.buildStartExtras(...extraArgs);
        db.prepare(
          `UPDATE ${tableName} SET status = 'running', started_at = ?${extras.setClause ? ', ' + extras.setClause : ''} WHERE id = ?${extras.whereExtra ? ' AND ' + extras.whereExtra : ''}`
        ).run(now, ...extras.params, id);
      } else {
        db.prepare(
          `UPDATE ${tableName} SET status = 'running', started_at = ? WHERE id = ?`
        ).run(now, id);
      }

      return selectOne<TRecord>(db, `SELECT * FROM ${tableName} WHERE id = ?`, id);
    },

    completeAnalysis(id: string, data: TCompleteData): TRecord | null {
      const db = getDatabase();
      const now = getCurrentTimestamp();
      const { setClause, params } = config.buildCompleteSql(data, now);

      db.prepare(
        `UPDATE ${tableName} SET status = 'completed', completed_at = ?, ${setClause} WHERE id = ?`
      ).run(now, ...params, id);

      return selectOne<TRecord>(db, `SELECT * FROM ${tableName} WHERE id = ?`, id);
    },

    failAnalysis(id: string, errorMessage: string): TRecord | null {
      const db = getDatabase();
      const now = getCurrentTimestamp();

      db.prepare(
        `UPDATE ${tableName} SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?`
      ).run(now, errorMessage, id);

      return selectOne<TRecord>(db, `SELECT * FROM ${tableName} WHERE id = ?`, id);
    },

    delete(id: string): boolean {
      const db = getDatabase();
      const result = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
      return result.changes > 0;
    },

    /**
     * Generic history query – caller provides the WHERE filter.
     */
    getHistoryWhere(where: string, params: unknown[], limit: number = 10): TRecord[] {
      const db = getDatabase();
      return selectAll<TRecord>(
        db,
        `SELECT * FROM ${tableName} WHERE ${where} ORDER BY created_at DESC LIMIT ?`,
        ...params,
        limit
      );
    },

    /**
     * Generic single-row query.
     */
    findOneWhere(where: string, ...params: unknown[]): TRecord | null {
      const db = getDatabase();
      return selectOne<TRecord>(
        db,
        `SELECT * FROM ${tableName} WHERE ${where}`,
        ...params
      );
    },

    /**
     * Generic multi-row query.
     */
    findAllWhere(where: string, ...params: unknown[]): TRecord[] {
      const db = getDatabase();
      return selectAll<TRecord>(
        db,
        `SELECT * FROM ${tableName} WHERE ${where}`,
        ...params
      );
    },
  };
}

export type BaseAnalysisRepository<
  TRecord extends BaseAnalysisRecord,
  TCreateInput,
  TCompleteData,
> = ReturnType<typeof createBaseAnalysisRepository<TRecord, TCreateInput, TCompleteData>>;

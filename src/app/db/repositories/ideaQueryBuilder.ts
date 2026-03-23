/**
 * Composable Query Builder for the Ideas table.
 *
 * Replaces the many near-identical getIdeasBy* methods with a single chainable API:
 *
 *   queryIdeas().project(id).status('pending').withColors().limit(20).execute()
 *
 * Each filter appends a WHERE clause fragment. The builder handles JOIN injection
 * (context colors) and keyset cursor pagination uniformly.
 */

import { getDatabase } from '../connection';
import type { DbIdea, DbIdeaWithColor } from '../models/types';

type IdeaStatus = 'pending' | 'accepted' | 'rejected' | 'implemented';

interface WhereClause {
  sql: string;
  params: unknown[];
}

interface PaginationResult<T> {
  ideas: T[];
  nextCursor: string | null;
}

class IdeaQueryBuilder<T extends DbIdea = DbIdea> {
  private whereClauses: WhereClause[] = [];
  private joinColors = false;
  private limitValue: number | null = null;
  private cursorId: string | null = null;
  private countMode = false;
  private deleteMode = false;

  /** Filter by a single project_id */
  project(projectId: string): IdeaQueryBuilder<T> {
    this.whereClauses.push({ sql: 'ideas.project_id = ?', params: [projectId] });
    return this;
  }

  /** Filter by multiple project_ids */
  projects(projectIds: string[]): IdeaQueryBuilder<T> {
    if (projectIds.length === 0) {
      // Force empty result
      this.whereClauses.push({ sql: '1 = 0', params: [] });
      return this;
    }
    const placeholders = projectIds.map(() => '?').join(',');
    this.whereClauses.push({ sql: `ideas.project_id IN (${placeholders})`, params: projectIds });
    return this;
  }

  /** Filter by status */
  status(status: IdeaStatus | string): IdeaQueryBuilder<T> {
    this.whereClauses.push({ sql: 'ideas.status = ?', params: [status] });
    return this;
  }

  /** Filter by context_id */
  context(contextId: string): IdeaQueryBuilder<T> {
    this.whereClauses.push({ sql: 'ideas.context_id = ?', params: [contextId] });
    return this;
  }

  /** Filter for NULL context_id */
  nullContext(): IdeaQueryBuilder<T> {
    this.whereClauses.push({ sql: 'ideas.context_id IS NULL', params: [] });
    return this;
  }

  /** Filter by goal_id */
  goal(goalId: string): IdeaQueryBuilder<T> {
    this.whereClauses.push({ sql: 'ideas.goal_id = ?', params: [goalId] });
    return this;
  }

  /** Filter by scan_id */
  scan(scanId: string): IdeaQueryBuilder<T> {
    this.whereClauses.push({ sql: 'ideas.scan_id = ?', params: [scanId] });
    return this;
  }

  /** Filter by date range on created_at */
  dateRange(startDate: string, endDate: string): IdeaQueryBuilder<T> {
    this.whereClauses.push({
      sql: 'ideas.created_at >= ? AND ideas.created_at <= ?',
      params: [startDate, endDate],
    });
    return this;
  }

  /** Include context group colors via LEFT JOIN */
  withColors(): IdeaQueryBuilder<DbIdeaWithColor> {
    this.joinColors = true;
    return this as unknown as IdeaQueryBuilder<DbIdeaWithColor>;
  }

  /** Limit the number of results */
  limit(n: number): IdeaQueryBuilder<T> {
    this.limitValue = n;
    return this;
  }

  /** Enable keyset cursor pagination (pass the last idea id from previous page) */
  after(cursorId: string | null): IdeaQueryBuilder<T> {
    this.cursorId = cursorId;
    return this;
  }

  /** Execute and return matching ideas */
  execute(): T[] {
    const db = getDatabase();
    const { sql, params } = this.buildSelect();
    return db.prepare(sql).all(...params) as T[];
  }

  /**
   * Execute with keyset cursor pagination.
   * Returns ideas and a nextCursor (last id) if more rows exist.
   */
  paginate(pageSize: number): PaginationResult<T> {
    this.limitValue = pageSize;
    const db = getDatabase();

    if (this.cursorId) {
      const cursor = db.prepare('SELECT created_at FROM ideas WHERE id = ?').get(this.cursorId) as { created_at: string } | undefined;
      if (!cursor) {
        return { ideas: [], nextCursor: null };
      }
      this.whereClauses.push({
        sql: '(ideas.created_at < ? OR (ideas.created_at = ? AND ideas.id < ?))',
        params: [cursor.created_at, cursor.created_at, this.cursorId],
      });
    }

    const { sql, params } = this.buildSelect();
    const ideas = db.prepare(sql).all(...params) as T[];
    const nextCursor = ideas.length === pageSize ? ideas[ideas.length - 1].id : null;
    return { ideas, nextCursor };
  }

  /** Execute a COUNT(*) query with the current filters */
  count(): number {
    this.countMode = true;
    const db = getDatabase();
    const { sql, params } = this.buildSelect();
    const result = db.prepare(sql).get(...params) as { count: number };
    this.countMode = false;
    return result.count;
  }

  /** Delete matching rows. Returns number of deleted rows. */
  delete(): number {
    this.deleteMode = true;
    const db = getDatabase();
    const { sql, params } = this.buildSelect();
    const result = db.prepare(sql).run(...params);
    this.deleteMode = false;
    return result.changes;
  }

  private buildSelect(): { sql: string; params: unknown[] } {
    const params: unknown[] = [];

    // SELECT or DELETE or COUNT
    let selectClause: string;
    if (this.deleteMode) {
      // DELETE does not support JOINs in SQLite, so use subquery if needed
      const whereStr = this.buildWhereString(params);
      const sql = `DELETE FROM ideas${whereStr}`;
      return { sql, params };
    } else if (this.countMode) {
      selectClause = 'SELECT COUNT(*) as count';
    } else if (this.joinColors) {
      selectClause = `SELECT ideas.*, context_groups.color as context_color`;
    } else {
      selectClause = 'SELECT ideas.*';
    }

    // FROM + JOINs
    let fromClause = 'FROM ideas';
    if (this.joinColors && !this.countMode) {
      fromClause += `
      LEFT JOIN contexts ON ideas.context_id = contexts.id
      LEFT JOIN context_groups ON contexts.group_id = context_groups.id`;
    }

    // WHERE
    const whereStr = this.buildWhereString(params);

    // ORDER BY + LIMIT
    let suffix = '';
    if (!this.countMode) {
      suffix = '\nORDER BY ideas.created_at DESC, ideas.id DESC';
      if (this.limitValue) {
        suffix += '\nLIMIT ?';
        params.push(this.limitValue);
      }
    }

    return { sql: `${selectClause}\n${fromClause}${whereStr}${suffix}`, params };
  }

  private buildWhereString(params: unknown[]): string {
    if (this.whereClauses.length === 0) return '';
    const conditions = this.whereClauses.map((w) => {
      params.push(...w.params);
      return w.sql;
    });
    return `\nWHERE ${conditions.join(' AND ')}`;
  }
}

/** Create a new composable idea query */
export function queryIdeas(): IdeaQueryBuilder {
  return new IdeaQueryBuilder();
}

/**
 * View Execution API
 * POST: Execute a cross-entity query and return unified results
 *
 * Queries multiple entity tables (ideas, goals, contexts, questions,
 * directions, knowledge_entries, tech_debt), normalizes results into
 * a common shape, and applies sort/group/limit.
 */

import { NextRequest } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { withObservability } from '@/lib/observability/middleware';
import type { ViewEntityType, ViewFilters } from '@/app/db/models/types';

export interface ViewResultRow {
  entity_type: ViewEntityType;
  id: string;
  title: string;
  status: string | null;
  category: string | null;
  effort: number | null;
  impact: number | null;
  context_name: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_ENTITY_TYPES: ViewEntityType[] = [
  'idea', 'goal', 'context', 'question', 'direction', 'knowledge_entry', 'tech_debt',
];

const VALID_SORT_FIELDS = ['title', 'status', 'created_at', 'updated_at', 'effort', 'impact', 'entity_type', 'category'];
const VALID_GROUP_FIELDS = ['entity_type', 'status', 'category'];

function buildEntityQuery(
  entityType: ViewEntityType,
  projectId: string,
  filters: ViewFilters,
): { sql: string; params: unknown[] } | null {
  const params: unknown[] = [];
  const conditions: string[] = [];

  switch (entityType) {
    case 'idea': {
      let sql = `
        SELECT
          'idea' as entity_type,
          i.id, i.title, i.status, i.category,
          i.effort, i.impact,
          c.name as context_name,
          i.description,
          i.created_at, i.updated_at
        FROM ideas i
        LEFT JOIN contexts c ON c.id = i.context_id
        WHERE i.project_id = ?
      `;
      params.push(projectId);

      if (filters.statuses?.length) {
        conditions.push(`i.status IN (${filters.statuses.map(() => '?').join(', ')})`);
        params.push(...filters.statuses);
      }
      if (filters.categories?.length) {
        conditions.push(`i.category IN (${filters.categories.map(() => '?').join(', ')})`);
        params.push(...filters.categories);
      }
      if (filters.effortMin != null) { conditions.push('i.effort >= ?'); params.push(filters.effortMin); }
      if (filters.effortMax != null) { conditions.push('i.effort <= ?'); params.push(filters.effortMax); }
      if (filters.impactMin != null) { conditions.push('i.impact >= ?'); params.push(filters.impactMin); }
      if (filters.impactMax != null) { conditions.push('i.impact <= ?'); params.push(filters.impactMax); }
      if (filters.dateFrom) { conditions.push('i.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('i.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(i.title LIKE ? OR i.description LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }
      if (filters.contextIds?.length) {
        conditions.push(`i.context_id IN (${filters.contextIds.map(() => '?').join(', ')})`);
        params.push(...filters.contextIds);
      }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    case 'goal': {
      let sql = `
        SELECT
          'goal' as entity_type,
          g.id, g.title, g.status, NULL as category,
          NULL as effort, NULL as impact,
          c.name as context_name,
          g.description,
          g.created_at, g.updated_at
        FROM goals g
        LEFT JOIN contexts c ON c.id = g.context_id
        WHERE g.project_id = ?
      `;
      params.push(projectId);

      if (filters.statuses?.length) {
        conditions.push(`g.status IN (${filters.statuses.map(() => '?').join(', ')})`);
        params.push(...filters.statuses);
      }
      if (filters.dateFrom) { conditions.push('g.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('g.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(g.title LIKE ? OR g.description LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }
      if (filters.contextIds?.length) {
        conditions.push(`g.context_id IN (${filters.contextIds.map(() => '?').join(', ')})`);
        params.push(...filters.contextIds);
      }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    case 'context': {
      let sql = `
        SELECT
          'context' as entity_type,
          ctx.id, ctx.name as title, NULL as status,
          cg.name as category,
          NULL as effort, NULL as impact,
          NULL as context_name,
          ctx.description,
          ctx.created_at, ctx.updated_at
        FROM contexts ctx
        LEFT JOIN context_groups cg ON cg.id = ctx.group_id
        WHERE ctx.project_id = ?
      `;
      params.push(projectId);

      if (filters.categories?.length) {
        conditions.push(`cg.name IN (${filters.categories.map(() => '?').join(', ')})`);
        params.push(...filters.categories);
      }
      if (filters.dateFrom) { conditions.push('ctx.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('ctx.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(ctx.name LIKE ? OR ctx.description LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    case 'question': {
      let sql = `
        SELECT
          'question' as entity_type,
          q.id, q.question as title, q.status,
          NULL as category,
          NULL as effort, NULL as impact,
          NULL as context_name,
          q.answer as description,
          q.created_at, q.updated_at
        FROM questions q
        WHERE q.project_id = ?
      `;
      params.push(projectId);

      if (filters.statuses?.length) {
        conditions.push(`q.status IN (${filters.statuses.map(() => '?').join(', ')})`);
        params.push(...filters.statuses);
      }
      if (filters.dateFrom) { conditions.push('q.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('q.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(q.question LIKE ? OR q.answer LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    case 'direction': {
      let sql = `
        SELECT
          'direction' as entity_type,
          d.id, d.summary as title, d.status,
          NULL as category,
          d.effort, d.impact,
          c.name as context_name,
          d.direction as description,
          d.created_at, d.updated_at
        FROM directions d
        LEFT JOIN contexts c ON c.id = d.context_id
        WHERE d.project_id = ?
      `;
      params.push(projectId);

      if (filters.statuses?.length) {
        conditions.push(`d.status IN (${filters.statuses.map(() => '?').join(', ')})`);
        params.push(...filters.statuses);
      }
      if (filters.effortMin != null) { conditions.push('d.effort >= ?'); params.push(filters.effortMin); }
      if (filters.effortMax != null) { conditions.push('d.effort <= ?'); params.push(filters.effortMax); }
      if (filters.impactMin != null) { conditions.push('d.impact >= ?'); params.push(filters.impactMin); }
      if (filters.impactMax != null) { conditions.push('d.impact <= ?'); params.push(filters.impactMax); }
      if (filters.dateFrom) { conditions.push('d.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('d.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(d.summary LIKE ? OR d.direction LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }
      if (filters.contextIds?.length) {
        conditions.push(`d.context_id IN (${filters.contextIds.map(() => '?').join(', ')})`);
        params.push(...filters.contextIds);
      }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    case 'knowledge_entry': {
      let sql = `
        SELECT
          'knowledge_entry' as entity_type,
          ke.id, ke.title, ke.status,
          ke.domain as category,
          NULL as effort, NULL as impact,
          NULL as context_name,
          ke.rationale as description,
          ke.created_at, ke.updated_at
        FROM knowledge_entries ke
      `;
      // knowledge_entries uses source_project_id
      const hasProjectCol = true;
      if (hasProjectCol) {
        sql += ' WHERE ke.source_project_id = ?';
        params.push(projectId);
      }

      if (filters.statuses?.length) {
        conditions.push(`ke.status IN (${filters.statuses.map(() => '?').join(', ')})`);
        params.push(...filters.statuses);
      }
      if (filters.categories?.length) {
        conditions.push(`ke.domain IN (${filters.categories.map(() => '?').join(', ')})`);
        params.push(...filters.categories);
      }
      if (filters.dateFrom) { conditions.push('ke.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('ke.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(ke.title LIKE ? OR ke.rationale LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    case 'tech_debt': {
      let sql = `
        SELECT
          'tech_debt' as entity_type,
          td.id, td.title, td.status,
          td.category,
          NULL as effort, NULL as impact,
          NULL as context_name,
          td.description,
          td.created_at, td.updated_at
        FROM tech_debt td
        WHERE td.project_id = ?
      `;
      params.push(projectId);

      if (filters.statuses?.length) {
        conditions.push(`td.status IN (${filters.statuses.map(() => '?').join(', ')})`);
        params.push(...filters.statuses);
      }
      if (filters.categories?.length) {
        conditions.push(`td.category IN (${filters.categories.map(() => '?').join(', ')})`);
        params.push(...filters.categories);
      }
      if (filters.dateFrom) { conditions.push('td.created_at >= ?'); params.push(filters.dateFrom); }
      if (filters.dateTo) { conditions.push('td.created_at <= ?'); params.push(filters.dateTo); }
      if (filters.searchQuery) { conditions.push('(td.title LIKE ? OR td.description LIKE ?)'); params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`); }

      if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
      return { sql, params };
    }

    default:
      return null;
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      entity_types,
      filters = {} as ViewFilters,
      sort_field = 'created_at',
      sort_direction = 'desc',
      group_by,
      limit = 200,
    } = body;

    if (!projectId) {
      return buildErrorResponse('projectId is required', { status: 400 });
    }

    const types: ViewEntityType[] = (entity_types ?? VALID_ENTITY_TYPES).filter(
      (t: string) => VALID_ENTITY_TYPES.includes(t as ViewEntityType),
    );

    if (types.length === 0) {
      return buildSuccessResponse({ rows: [], total: 0 });
    }

    // Validate sort/group fields
    const safeSortField = VALID_SORT_FIELDS.includes(sort_field) ? sort_field : 'created_at';
    const safeSortDir = sort_direction === 'asc' ? 'ASC' : 'DESC';
    const safeGroupBy = group_by && VALID_GROUP_FIELDS.includes(group_by) ? group_by : null;
    const safeLimit = Math.min(Math.max(1, limit), 500);

    const db = getDatabase();
    const unionParts: string[] = [];
    const allParams: unknown[] = [];

    for (const entityType of types) {
      const result = buildEntityQuery(entityType, projectId, filters);
      if (result) {
        unionParts.push(result.sql);
        allParams.push(...result.params);
      }
    }

    if (unionParts.length === 0) {
      return buildSuccessResponse({ rows: [], total: 0 });
    }

    const unionSql = unionParts.join(' UNION ALL ');
    const orderClause = `ORDER BY ${safeSortField} ${safeSortDir}`;

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${unionSql})`;
    const countResult = db.prepare(countSql).get(...allParams) as { total: number };

    // Get paginated results
    const dataSql = `SELECT * FROM (${unionSql}) ${orderClause} LIMIT ?`;
    const rows = db.prepare(dataSql).all(...allParams, safeLimit) as ViewResultRow[];

    // Group if requested
    let grouped: Record<string, ViewResultRow[]> | null = null;
    if (safeGroupBy) {
      grouped = {};
      for (const row of rows) {
        const key = String((row as unknown as Record<string, unknown>)[safeGroupBy] ?? 'Other');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }
    }

    return buildSuccessResponse({
      rows,
      total: countResult.total,
      grouped,
    });
  } catch (error) {
    console.error('[Views Execute API] POST error:', error);
    return buildErrorResponse('Failed to execute view query');
  }
}

export const POST = withObservability(handlePost, '/api/views/execute');

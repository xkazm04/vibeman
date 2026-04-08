/**
 * Schema Browser API
 * Provides row-level CRUD for all database tables with pagination,
 * schema introspection, and type-aware metadata for the UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';

// ── Safe identifier regex (matches repository.utils.ts) ──────────────
const SAFE_ID_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Validate table exists in the database (not just a whitelist — actual sqlite_master check) */
function tableExists(tableName: string): boolean {
  if (!SAFE_ID_RE.test(tableName)) return false;
  const db = getDatabase();
  const row = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`
  ).get(tableName) as { name: string } | undefined;
  return !!row;
}

interface ColumnMeta {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface CheckConstraint {
  column: string;
  values: string[];
}

/** Extract CHECK constraint enum values from CREATE TABLE SQL */
function extractCheckConstraints(tableName: string): CheckConstraint[] {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`
  ).get(tableName) as { sql: string } | undefined;
  if (!row?.sql) return [];

  const constraints: CheckConstraint[] = [];
  // Match patterns like: CHECK(status IN ('open','in_progress','done'))
  // or CHECK("status" IN ('open','in_progress','done'))
  const checkRe = /CHECK\s*\(\s*"?(\w+)"?\s+IN\s*\(([^)]+)\)\s*\)/gi;
  let match;
  while ((match = checkRe.exec(row.sql)) !== null) {
    const column = match[1];
    const valuesStr = match[2];
    const values = [...valuesStr.matchAll(/'([^']*)'/g)].map(m => m[1]);
    if (values.length > 0) {
      constraints.push({ column, values });
    }
  }
  return constraints;
}

/** Get column metadata for a table */
function getTableColumns(tableName: string): ColumnMeta[] {
  const db = getDatabase();
  return db.prepare(`PRAGMA table_info("${tableName}")`).all() as ColumnMeta[];
}

/** Get all user tables with row counts */
function getAllTables(): Array<{ name: string; rowCount: number }> {
  const db = getDatabase();
  const tables = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  ).all() as Array<{ name: string }>;

  return tables.map(t => {
    const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get() as { c: number };
    return { name: t.name, rowCount: count.c };
  });
}

// ── GET: List tables, table schema, or paginated rows ────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tables';

    if (action === 'tables') {
      const tables = getAllTables();
      return NextResponse.json({ success: true, tables });
    }

    if (action === 'schema') {
      const table = searchParams.get('table');
      if (!table || !tableExists(table)) {
        return NextResponse.json({ success: false, error: 'Invalid table name' }, { status: 400 });
      }
      const columns = getTableColumns(table);
      const checks = extractCheckConstraints(table);
      return NextResponse.json({ success: true, columns, checks });
    }

    if (action === 'rows') {
      const table = searchParams.get('table');
      if (!table || !tableExists(table)) {
        return NextResponse.json({ success: false, error: 'Invalid table name' }, { status: 400 });
      }
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
      const sortCol = searchParams.get('sort') || null;
      const sortDir = searchParams.get('dir') === 'asc' ? 'ASC' : 'DESC';

      const db = getDatabase();
      const countRow = db.prepare(`SELECT COUNT(*) as total FROM "${table}"`).get() as { total: number };
      const total = countRow.total;

      let orderClause = 'rowid DESC';
      if (sortCol && SAFE_ID_RE.test(sortCol)) {
        orderClause = `"${sortCol}" ${sortDir}`;
      }

      const offset = (page - 1) * pageSize;
      const rows = db.prepare(
        `SELECT * FROM "${table}" ORDER BY ${orderClause} LIMIT ? OFFSET ?`
      ).all(pageSize, offset) as Record<string, unknown>[];

      const columns = getTableColumns(table);
      const checks = extractCheckConstraints(table);

      return NextResponse.json({
        success: true,
        table,
        columns,
        checks,
        rows,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ── POST: Insert a new row ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, data } = body as { table?: string; data?: Record<string, unknown> };

    if (!table || !tableExists(table)) {
      return NextResponse.json({ success: false, error: 'Invalid table name' }, { status: 400 });
    }
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 });
    }

    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: unknown[] = [];

    for (const [key, val] of Object.entries(data)) {
      if (!SAFE_ID_RE.test(key)) {
        return NextResponse.json({ success: false, error: `Invalid column name: ${key}` }, { status: 400 });
      }
      columns.push(`"${key}"`);
      placeholders.push('?');
      values.push(val === undefined ? null : val);
    }

    const db = getDatabase();
    const sql = `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = db.prepare(sql).run(...values);

    return NextResponse.json({
      success: true,
      inserted: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Insert failed' },
      { status: 500 }
    );
  }
}

// ── PUT: Update a single cell ────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, id, idColumn, column, value } = body as {
      table?: string;
      id?: string;
      idColumn?: string;
      column?: string;
      value?: unknown;
    };

    if (!table || !tableExists(table)) {
      return NextResponse.json({ success: false, error: 'Invalid table name' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Row ID is required' }, { status: 400 });
    }
    if (!column || !SAFE_ID_RE.test(column)) {
      return NextResponse.json({ success: false, error: 'Invalid column name' }, { status: 400 });
    }

    const pkCol = idColumn && SAFE_ID_RE.test(idColumn) ? idColumn : 'id';

    const db = getDatabase();
    const sql = `UPDATE "${table}" SET "${column}" = ? WHERE "${pkCol}" = ?`;
    const result = db.prepare(sql).run(value === undefined ? null : value, id);

    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

// ── DELETE: Remove a row ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');
    const idColumn = searchParams.get('idColumn');

    if (!table || !tableExists(table)) {
      return NextResponse.json({ success: false, error: 'Invalid table name' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Row ID is required' }, { status: 400 });
    }

    const pkCol = idColumn && SAFE_ID_RE.test(idColumn) ? idColumn : 'id';

    const db = getDatabase();
    const sql = `DELETE FROM "${table}" WHERE "${pkCol}" = ?`;
    const result = db.prepare(sql).run(id);

    return NextResponse.json({ success: true, deleted: result.changes });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

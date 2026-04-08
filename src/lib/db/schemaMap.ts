/**
 * Schema Map Generator
 * Extracts table metadata from the SQLite database to provide
 * an LLM-friendly schema description for natural language query translation.
 */

import { getDatabase } from '@/app/db/connection';

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface SchemaMap {
  tables: TableInfo[];
  generatedAt: string;
}

// Compact text format for LLM prompts — minimizes token usage
function formatForLLM(schema: SchemaMap): string {
  const lines: string[] = ['DATABASE SCHEMA (SQLite):', ''];
  for (const table of schema.tables) {
    const cols = table.columns.map(c => {
      let def = `${c.name} ${c.type}`;
      if (c.pk) def += ' PK';
      if (c.notnull) def += ' NOT NULL';
      return def;
    });
    lines.push(`TABLE ${table.name} (~${table.rowCount} rows):`);
    lines.push(`  ${cols.join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

// Tables to exclude from the schema map (internal/system tables)
const EXCLUDED_TABLES = new Set([
  '_migrations_applied',
  'sqlite_sequence',
  'sqlite_stat1',
]);

let cachedSchema: { map: SchemaMap; text: string; ts: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get the full schema map from the live database.
 * Results are cached for 1 minute.
 */
export function getSchemaMap(): { map: SchemaMap; text: string } {
  if (cachedSchema && Date.now() - cachedSchema.ts < CACHE_TTL_MS) {
    return { map: cachedSchema.map, text: cachedSchema.text };
  }

  const db = getDatabase();

  // Get all user tables
  const tables = (db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  ).all() as { name: string }[]).filter(t => !EXCLUDED_TABLES.has(t.name) && !t.name.startsWith('sqlite_'));

  const tableInfos: TableInfo[] = [];

  for (const { name } of tables) {
    const columns = db.prepare(`PRAGMA table_info('${name}')`).all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;

    let rowCount = 0;
    try {
      const row = db.prepare(`SELECT COUNT(*) as cnt FROM "${name}"`).get() as { cnt: number } | undefined;
      rowCount = row?.cnt ?? 0;
    } catch {
      // Table might be in a bad state
    }

    tableInfos.push({
      name,
      columns: columns.map(c => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull === 1,
        pk: c.pk === 1,
        dflt_value: c.dflt_value,
      })),
      rowCount,
    });
  }

  const map: SchemaMap = { tables: tableInfos, generatedAt: new Date().toISOString() };
  const text = formatForLLM(map);
  cachedSchema = { map, text, ts: Date.now() };
  return { map, text };
}

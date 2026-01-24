/**
 * Migration 050: Context API Routes Table
 * Maps API endpoints to contexts for X-Ray visualization and observability
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  return columns.some(col => col.name === columnName);
}

export function migrate050ContextApiRoutes(db: Database.Database): void {
  // Create context_api_routes table for mapping API paths to contexts
  if (!tableExists(db, 'context_api_routes')) {
    db.exec(`
      CREATE TABLE context_api_routes (
        id TEXT PRIMARY KEY,
        context_id TEXT NOT NULL,
        api_path TEXT NOT NULL,
        http_methods TEXT NOT NULL DEFAULT 'GET',
        layer TEXT NOT NULL DEFAULT 'server' CHECK (layer IN ('pages', 'client', 'server', 'external')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(context_id, api_path),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_context_api_routes_context ON context_api_routes(context_id);
      CREATE INDEX idx_context_api_routes_path ON context_api_routes(api_path);
      CREATE INDEX idx_context_api_routes_layer ON context_api_routes(layer);
    `);
    console.log('[Migration 050] Created context_api_routes table');
  }

  // Add new columns to contexts table for enhanced context storage
  if (tableExists(db, 'contexts')) {
    if (!columnExists(db, 'contexts', 'category')) {
      db.exec(`ALTER TABLE contexts ADD COLUMN category TEXT`);
      console.log('[Migration 050] Added category column to contexts table');
    }

    if (!columnExists(db, 'contexts', 'api_routes')) {
      db.exec(`ALTER TABLE contexts ADD COLUMN api_routes TEXT`);
      console.log('[Migration 050] Added api_routes column to contexts table');
    }

    if (!columnExists(db, 'contexts', 'business_feature')) {
      db.exec(`ALTER TABLE contexts ADD COLUMN business_feature TEXT`);
      console.log('[Migration 050] Added business_feature column to contexts table');
    }
  }
}

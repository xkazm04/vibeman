/**
 * Migration 221: Cross-Project Patterns
 *
 * Stores patterns that emerge across multiple projects —
 * promoted insights, architecture drift observations,
 * and reusable templates extracted from successful executions.
 */

import type { DbConnection } from '../drivers/types';
import type { MigrationLogger } from './migration.utils';
import { runOnce, createTableIfNotExists } from './migration.utils';

export function migrate221CrossProjectPatterns(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  runOnce(db, 'm221', () => {
    createTableIfNotExists(db, 'cross_project_patterns', `
      CREATE TABLE IF NOT EXISTS cross_project_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        source_project_ids TEXT NOT NULL DEFAULT '[]',
        confidence REAL NOT NULL DEFAULT 0.5,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        evidence TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        promoted_at TEXT,
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, logger);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cpp_pattern_type ON cross_project_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_cpp_status ON cross_project_patterns(status);
      CREATE INDEX IF NOT EXISTS idx_cpp_confidence ON cross_project_patterns(confidence DESC);
    `);

    logger?.success('Migration 221: created cross_project_patterns table');
  }, logger);
}

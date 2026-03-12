/**
 * Migration 145: Re-run Ideas Effort/Impact CHECK Constraint Fix
 *
 * Migration 143 was added to the DESTRUCTIVE_MIGRATIONS pre-seed list,
 * which caused it to be marked as "already applied" on existing databases
 * without actually running. This migration re-probes the constraint and
 * recreates the table with the FULL schema (including columns from m142
 * and m144) if the 1-3 constraint is still active.
 *
 * Also ensures `detailed`, `provider`, and `model` columns exist even
 * if the table doesn't need constraint fixing (they may be missing if
 * m142/m144 ran against a table that was later recreated by m143).
 */

import { tableExists, addColumnsIfNotExist, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate145FixIdeasEffortConstraintRetry(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  if (!tableExists(db, 'ideas')) {
    logger?.info?.('ideas table does not exist, skipping');
    return;
  }

  // Phase 1: Ensure columns from m142 (provider, model) and m144 (detailed) exist.
  // These may be missing if the table was recreated by m143 after m142/m144 ran.
  addColumnsIfNotExist(db, 'ideas', [
    { name: 'provider', definition: 'TEXT' },
    { name: 'model', definition: 'TEXT' },
    { name: 'detailed', definition: 'INTEGER DEFAULT 0' },
  ], logger);

  // Phase 2: Probe the CHECK constraint — try inserting effort=5.
  let needsFix = false;
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    const probeStmt = db.prepare(`
      INSERT INTO ideas (id, scan_id, project_id, category, title, status, effort, created_at, updated_at)
      VALUES ('__probe_145__', '__probe__', '__probe__', '__probe__', '__probe__', 'pending', 5, datetime('now'), datetime('now'))
    `);
    probeStmt.run();
    db.prepare(`DELETE FROM ideas WHERE id = '__probe_145__'`).run();
    db.exec('PRAGMA foreign_keys = ON');
    logger?.info?.('ideas table already supports 1-10 effort/impact scale');
    return;
  } catch (e: unknown) {
    db.exec('PRAGMA foreign_keys = ON');
    const error = e as Error;
    if (error.message?.includes('CHECK constraint')) {
      needsFix = true;
    } else {
      logger?.error?.('Unexpected error probing ideas constraint', e);
      return;
    }
  }

  if (!needsFix) return;

  logger?.info?.('Updating ideas CHECK constraints from 1-3 to 1-10 scale (with full schema)...');

  db.exec('PRAGMA foreign_keys = OFF');

  try {
    db.exec('BEGIN TRANSACTION');

    db.exec(`ALTER TABLE ideas RENAME TO ideas_old_145`);

    // Full schema including columns from m142 (provider, model) and m144 (detailed)
    db.exec(`
      CREATE TABLE ideas (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        context_id TEXT,
        scan_type TEXT DEFAULT 'overall',
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        reasoning TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
        user_feedback TEXT,
        user_pattern INTEGER DEFAULT 0,
        effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 10)),
        impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 10)),
        implemented_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        requirement_id TEXT,
        goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
        risk INTEGER CHECK (risk IS NULL OR (risk >= 1 AND risk <= 10)),
        provider TEXT,
        model TEXT,
        detailed INTEGER DEFAULT 0,
        FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      )
    `);

    // Copy data — dynamically detect which source columns exist to avoid errors
    // if the old table was missing provider/model/detailed
    const oldColumns = (db.prepare(`PRAGMA table_info(ideas_old_145)`).all() as Array<{ name: string }>)
      .map(c => c.name);

    // Columns that exist in both source and target
    const targetColumns = [
      'id', 'scan_id', 'project_id', 'context_id', 'scan_type', 'category', 'title',
      'description', 'reasoning', 'status', 'user_feedback', 'user_pattern',
      'effort', 'impact', 'implemented_at', 'created_at', 'updated_at',
      'requirement_id', 'goal_id', 'risk', 'provider', 'model', 'detailed',
    ];
    const commonColumns = targetColumns.filter(c => oldColumns.includes(c));
    const columnList = commonColumns.join(', ');

    db.exec(`INSERT INTO ideas (${columnList}) SELECT ${columnList} FROM ideas_old_145`);

    db.exec(`DROP TABLE ideas_old_145`);

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ideas_scan_id ON ideas(scan_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_context_id ON ideas(context_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(project_id, status);
      CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
      CREATE INDEX IF NOT EXISTS idx_ideas_project_status_created ON ideas(project_id, status, created_at);
      CREATE INDEX IF NOT EXISTS idx_ideas_project_status_category ON ideas(project_id, status, category);
    `);

    db.exec('COMMIT');

    logger?.success?.('ideas table rebuilt with full schema and 1-10 scale constraints');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    logger?.error?.('Failed to update ideas table constraints', error);
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

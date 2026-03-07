/**
 * Migration 143: Fix Ideas Effort/Impact CHECK Constraints
 *
 * The ideas table may still have the old 1-3 CHECK constraints on effort/impact
 * if Migration 35 (migrateIdeasExtendedScoring) returned early because the risk
 * column already existed. This migration probes the constraint and recreates
 * the table with 1-10 constraints if needed.
 */

import { tableExists, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate143FixIdeasEffortConstraint(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  if (!tableExists(db, 'ideas')) {
    logger?.info?.('ideas table does not exist, skipping constraint fix');
    return;
  }

  // Probe: try inserting effort=5 — if the old 1-3 constraint is active this will fail
  let needsFix = false;
  try {
    const probeStmt = db.prepare(`
      INSERT INTO ideas (id, scan_id, project_id, category, title, status, effort, created_at, updated_at)
      VALUES ('__probe_143__', '__probe__', '__probe__', '__probe__', '__probe__', 'pending', 5, datetime('now'), datetime('now'))
    `);
    probeStmt.run();
    db.prepare(`DELETE FROM ideas WHERE id = '__probe_143__'`).run();
    logger?.info?.('ideas table already supports 1-10 effort/impact scale');
    return;
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message?.includes('CHECK constraint')) {
      needsFix = true;
    } else {
      // FK violation or other error — probe with FK off
      try {
        db.exec('PRAGMA foreign_keys = OFF');
        const probeStmt = db.prepare(`
          INSERT INTO ideas (id, scan_id, project_id, category, title, status, effort, created_at, updated_at)
          VALUES ('__probe_143__', '__probe__', '__probe__', '__probe__', '__probe__', 'pending', 5, datetime('now'), datetime('now'))
        `);
        probeStmt.run();
        db.prepare(`DELETE FROM ideas WHERE id = '__probe_143__'`).run();
        db.exec('PRAGMA foreign_keys = ON');
        logger?.info?.('ideas table already supports 1-10 effort/impact scale');
        return;
      } catch (e2: unknown) {
        db.exec('PRAGMA foreign_keys = ON');
        const error2 = e2 as Error;
        if (error2.message?.includes('CHECK constraint')) {
          needsFix = true;
        } else {
          logger?.error?.('Unexpected error probing ideas constraint', e2);
          return;
        }
      }
    }
  }

  if (!needsFix) return;

  logger?.info?.('Updating ideas CHECK constraints from 1-3 to 1-10 scale...');

  // Use a transaction so if anything fails, the rename is rolled back
  db.exec('PRAGMA foreign_keys = OFF');

  try {
    db.exec('BEGIN TRANSACTION');

    db.exec(`ALTER TABLE ideas RENAME TO ideas_old_143`);

    // Hardcoded schema matching the actual table structure
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
        FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      )
    `);

    // Copy all data — only select columns that exist in both tables
    db.exec(`
      INSERT INTO ideas (
        id, scan_id, project_id, context_id, scan_type, category, title,
        description, reasoning, status, user_feedback, user_pattern,
        effort, impact, implemented_at, created_at, updated_at,
        requirement_id, goal_id, risk, provider, model
      )
      SELECT
        id, scan_id, project_id, context_id, scan_type, category, title,
        description, reasoning, status, user_feedback, user_pattern,
        effort, impact, implemented_at, created_at, updated_at,
        requirement_id, goal_id, risk, provider, model
      FROM ideas_old_143
    `);

    db.exec(`DROP TABLE ideas_old_143`);

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

    logger?.success?.('ideas table CHECK constraints updated to 1-10 scale');
  } catch (error) {
    // Roll back — this restores the original table from the rename
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    logger?.error?.('Failed to update ideas table constraints', error);
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

/**
 * Migration 067: Fix CHECK Constraints
 *
 * Fixes two CHECK constraint issues:
 * 1. directions.status: Add 'processing' to allowed values
 * 2. behavioral_signals.signal_type: Add missing signal types
 *
 * SQLite doesn't support ALTER CONSTRAINT, so we must recreate tables.
 */

import { getConnection } from '../drivers';
import { tableExists } from './migration.utils';

/**
 * Check if a column exists and get its info
 */
function getColumnInfo(db: ReturnType<typeof getConnection>, table: string, column: string): boolean {
  try {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return info.some(col => col.name === column);
  } catch {
    return false;
  }
}

/**
 * Check if the status constraint needs updating by trying to insert 'processing'
 */
function needsDirectionsStatusFix(db: ReturnType<typeof getConnection>): boolean {
  try {
    // Try to check if 'processing' is allowed by examining a temp insert
    // Use a transaction that we'll rollback
    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare(`
        INSERT INTO directions (id, project_id, context_map_id, context_map_title, direction, summary, status)
        VALUES ('__test_constraint__', '__test__', '__test__', '__test__', '__test__', '__test__', 'processing')
      `).run();
      // If we get here, the constraint allows 'processing' - delete and return false
      db.prepare(`DELETE FROM directions WHERE id = '__test_constraint__'`).run();
      db.exec('COMMIT');
      return false;
    } catch (e: unknown) {
      db.exec('ROLLBACK');
      const error = e as Error;
      // If we get a constraint error, we need to fix it
      if (error.message?.includes('CHECK constraint')) {
        return true;
      }
      throw e;
    }
  } catch {
    return true; // Assume we need to fix if check fails
  }
}

/**
 * Check if behavioral_signals needs signal_type constraint update
 */
function needsBehavioralSignalsFix(db: ReturnType<typeof getConnection>): boolean {
  try {
    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare(`
        INSERT INTO behavioral_signals (id, project_id, signal_type, data, timestamp)
        VALUES ('__test_constraint__', '__test__', 'cli_memory', '{}', datetime('now'))
      `).run();
      db.prepare(`DELETE FROM behavioral_signals WHERE id = '__test_constraint__'`).run();
      db.exec('COMMIT');
      return false;
    } catch (e: unknown) {
      db.exec('ROLLBACK');
      const error = e as Error;
      if (error.message?.includes('CHECK constraint')) {
        return true;
      }
      throw e;
    }
  } catch {
    return true;
  }
}

export function migrate067FixCheckConstraints(): void {
  const db = getConnection();

  // Fix 1: directions.status CHECK constraint
  if (tableExists(db, 'directions')) {
    if (needsDirectionsStatusFix(db)) {
      console.log('[Migration 067] Updating directions.status CHECK constraint...');

      // Get all existing columns to preserve them
      const hasPairId = getColumnInfo(db, 'directions', 'pair_id');
      const hasPairLabel = getColumnInfo(db, 'directions', 'pair_label');
      const hasProblemStatement = getColumnInfo(db, 'directions', 'problem_statement');
      const hasContextId = getColumnInfo(db, 'directions', 'context_id');
      const hasContextName = getColumnInfo(db, 'directions', 'context_name');
      const hasContextGroupId = getColumnInfo(db, 'directions', 'context_group_id');

      // Build column list based on what exists
      let columns = `id, project_id, context_map_id, context_map_title, direction, summary, status,
        requirement_id, requirement_path, created_at, updated_at`;

      if (hasContextId) columns += ', context_id';
      if (hasContextName) columns += ', context_name';
      if (hasContextGroupId) columns += ', context_group_id';
      if (hasPairId) columns += ', pair_id';
      if (hasPairLabel) columns += ', pair_label';
      if (hasProblemStatement) columns += ', problem_statement';

      db.exec(`
        -- Create new table with updated constraint
        CREATE TABLE directions_new (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          context_map_id TEXT NOT NULL,
          context_map_title TEXT NOT NULL,
          direction TEXT NOT NULL,
          summary TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'accepted', 'rejected')),
          requirement_id TEXT,
          requirement_path TEXT,
          context_id TEXT,
          context_name TEXT,
          context_group_id TEXT,
          pair_id TEXT,
          pair_label TEXT,
          problem_statement TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Copy all data
        INSERT INTO directions_new (${columns})
        SELECT ${columns} FROM directions;

        -- Drop old table
        DROP TABLE directions;

        -- Rename new table
        ALTER TABLE directions_new RENAME TO directions;

        -- Recreate indexes
        CREATE INDEX IF NOT EXISTS idx_directions_project ON directions(project_id);
        CREATE INDEX IF NOT EXISTS idx_directions_status ON directions(status);
        CREATE INDEX IF NOT EXISTS idx_directions_context_map ON directions(context_map_id);
        CREATE INDEX IF NOT EXISTS idx_directions_pair ON directions(pair_id);
      `);

      console.log('[Migration 067] directions.status constraint updated');
    }
  }

  // Fix 2: behavioral_signals.signal_type CHECK constraint
  if (tableExists(db, 'behavioral_signals')) {
    if (needsBehavioralSignalsFix(db)) {
      console.log('[Migration 067] Updating behavioral_signals.signal_type CHECK constraint...');

      db.exec(`
        -- Create new table with updated constraint
        CREATE TABLE behavioral_signals_new (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          signal_type TEXT NOT NULL CHECK (signal_type IN (
            'git_activity', 'api_focus', 'context_focus', 'implementation',
            'cross_task_analysis', 'cross_task_selection', 'cli_memory'
          )),
          context_id TEXT,
          context_name TEXT,
          data TEXT NOT NULL,
          weight REAL DEFAULT 1.0,
          timestamp TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Copy all data
        INSERT INTO behavioral_signals_new
        SELECT * FROM behavioral_signals;

        -- Drop old table
        DROP TABLE behavioral_signals;

        -- Rename new table
        ALTER TABLE behavioral_signals_new RENAME TO behavioral_signals;

        -- Recreate indexes
        CREATE INDEX IF NOT EXISTS idx_behavioral_signals_project_id ON behavioral_signals(project_id);
        CREATE INDEX IF NOT EXISTS idx_behavioral_signals_type ON behavioral_signals(signal_type);
        CREATE INDEX IF NOT EXISTS idx_behavioral_signals_timestamp ON behavioral_signals(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_behavioral_signals_context ON behavioral_signals(context_id);
      `);

      console.log('[Migration 067] behavioral_signals.signal_type constraint updated');
    }
  }
}

/**
 * Migration 073: Drop insights_generated column
 * 
 * Removes the legacy JSON-blob column from brain_reflections table.
 * Data was migrated to the normalized brain_insights table in Migration 071.
 */

import Database from 'better-sqlite3';
import { safeMigration, hasColumn, type MigrationLogger } from './migration.utils';

export function migrate073DropInsightsGeneratedColumn(
  db: any,
  logger?: MigrationLogger
): void {
  safeMigration('dropInsightsGeneratedColumn', () => {
    if (!hasColumn(db, 'brain_reflections', 'insights_generated')) {
      logger?.info?.('Column insights_generated already removed from brain_reflections');
      return;
    }

    // SQLite 3.35.0+ supports ALTER TABLE DROP COLUMN
    // We verified the environment has a recent enough version
    try {
      db.exec('ALTER TABLE brain_reflections DROP COLUMN insights_generated');
      logger?.info?.('Dropped legacy insights_generated column from brain_reflections');
    } catch (err) {
      logger?.error?.('Failed to drop column using ALTER TABLE. Attempting legacy recreate pattern...', err);
      
      // Fallback: Recreate table pattern (standard SQLite approach for older versions)
      db.transaction(() => {
        // 1. Create new table without the column
        db.exec(`
          CREATE TABLE brain_reflections_new (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
            trigger_type TEXT NOT NULL CHECK (trigger_type IN ('threshold', 'scheduled', 'manual')),
            scope TEXT NOT NULL DEFAULT 'project',
            directions_analyzed INTEGER DEFAULT 0,
            outcomes_analyzed INTEGER DEFAULT 0,
            signals_analyzed INTEGER DEFAULT 0,
            guide_sections_updated TEXT,
            error_message TEXT,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);

        // 2. Copy data
        db.exec(`
          INSERT INTO brain_reflections_new (
            id, project_id, status, trigger_type, scope, 
            directions_analyzed, outcomes_analyzed, signals_analyzed,
            guide_sections_updated, error_message, started_at, completed_at, created_at
          )
          SELECT 
            id, project_id, status, trigger_type, COALESCE(scope, 'project'),
            directions_analyzed, outcomes_analyzed, signals_analyzed,
            guide_sections_updated, error_message, started_at, completed_at, created_at
          FROM brain_reflections
        `);

        // 3. Swap tables
        db.exec('DROP TABLE brain_reflections');
        db.exec('ALTER TABLE brain_reflections_new RENAME TO brain_reflections');

        // 4. Recreate indexes
        db.exec('CREATE INDEX idx_brain_reflections_project_id ON brain_reflections(project_id)');
        db.exec('CREATE INDEX idx_brain_reflections_status ON brain_reflections(status)');
        db.exec('CREATE INDEX idx_brain_reflections_created ON brain_reflections(created_at DESC)');
      })();
      
      logger?.info?.('Successfully removed insights_generated column via table recreation');
    }
  }, logger);
}

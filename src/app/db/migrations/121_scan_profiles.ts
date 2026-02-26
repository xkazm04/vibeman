/**
 * Migration 121: Scan Profiles
 *
 * Creates the scan_profiles table for goal-driven scan configuration.
 * Each profile links a goal to a set of agent types, contexts, and
 * custom prompt overrides, enabling OKR-focused idea generation.
 */

import type { DbConnection } from '../drivers/types';
import { safeMigration, createTableIfNotExists, type MigrationLogger } from './migration.utils';

export function migrate121ScanProfiles(db: DbConnection, logger: MigrationLogger): void {
  safeMigration('121_scan_profiles', () => {
    createTableIfNotExists(db, 'scan_profiles', `
      CREATE TABLE scan_profiles (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        goal_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        scan_types TEXT NOT NULL,
        context_ids TEXT,
        group_ids TEXT,
        prompt_overrides TEXT,
        last_run_at TEXT,
        run_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
      )
    `, logger);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_scan_profiles_project ON scan_profiles(project_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_scan_profiles_goal ON scan_profiles(goal_id)`);

    logger.success('Migration 121: Scan Profiles table created');
  }, logger);
}

/**
 * Migration 141: Triage Rules table
 * Stores user-defined auto-triage rules for ideas (auto-accept, auto-reject, auto-archive).
 * Inspired by Gmail filters and Linear auto-triage.
 */

import { safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate141TriageRules(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('triageRules', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS triage_rules (
        id            TEXT PRIMARY KEY,
        project_id    TEXT,
        name          TEXT NOT NULL,
        description   TEXT,
        action        TEXT NOT NULL DEFAULT 'accept'
                      CHECK(action IN ('accept', 'reject', 'archive')),
        conditions    TEXT NOT NULL DEFAULT '[]',
        enabled       INTEGER NOT NULL DEFAULT 1,
        priority      INTEGER NOT NULL DEFAULT 0,
        times_fired   INTEGER NOT NULL DEFAULT 0,
        last_fired_at TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_triage_rules_project
      ON triage_rules(project_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_triage_rules_enabled
      ON triage_rules(enabled)
    `);

    logger?.info?.('Created triage_rules table');
  }, logger);
}

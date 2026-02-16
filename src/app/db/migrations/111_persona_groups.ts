/**
 * Migration 111: Persona Groups
 *
 * Creates persona_groups table and adds group_id column to personas
 */

import type { MigrationLogger } from './migration.utils';

export function migrate111PersonaGroups(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  // Create persona_groups table
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6B7280',
        sort_order INTEGER DEFAULT 0,
        collapsed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 111] Created persona_groups table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 111] persona_groups table already exists');
  }

  // Add group_id column to personas
  try {
    db.prepare('ALTER TABLE personas ADD COLUMN group_id TEXT REFERENCES persona_groups(id) ON DELETE SET NULL').run();
    logger.info('[Migration 111] Added group_id column to personas');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      logger.info('[Migration 111] group_id column may already exist: ' + e.message);
    }
  }

  // Indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_persona_group_id ON personas(group_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_persona_groups_sort ON persona_groups(sort_order)').run();
    logger.info('[Migration 111] Created group indexes');
  } catch (e: any) {
    logger.info('[Migration 111] Indexes already exist: ' + e.message);
  }
}

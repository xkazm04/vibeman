/**
 * Migration 110: Healing Issues
 *
 * Creates table for persona healing issue tracking
 * Used by the healing engine to store analysis of failed executions
 */

import type { MigrationLogger } from './migration.utils';

export function migrate110HealingIssues(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_healing_issues (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        execution_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'prompt',
        suggested_fix TEXT,
        auto_fixed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now')),
        resolved_at TEXT
      )
    `).run();
    logger.info('[Migration 110] Created persona_healing_issues table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 110] persona_healing_issues table already exists');
  }

  // Indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_healing_persona ON persona_healing_issues(persona_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_healing_status ON persona_healing_issues(status)').run();
    logger.info('[Migration 110] Created healing issues indexes');
  } catch (e: any) {
    logger.info('[Migration 110] Indexes already exist: ' + e.message);
  }
}

/**
 * Migration 108: Observability
 *
 * Creates tables for persona metrics snapshots and prompt version history
 */

import type { MigrationLogger } from './migration.utils';

export function migrate108Observability(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_metrics_snapshots (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        total_executions INTEGER DEFAULT 0,
        successful_executions INTEGER DEFAULT 0,
        failed_executions INTEGER DEFAULT 0,
        total_cost_usd REAL DEFAULT 0,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0,
        avg_duration_ms REAL DEFAULT 0,
        tools_used TEXT,
        events_emitted INTEGER DEFAULT 0,
        events_consumed INTEGER DEFAULT 0,
        messages_sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 108] Created persona_metrics_snapshots table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 108] persona_metrics_snapshots table already exists');
  }

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_prompt_versions (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        structured_prompt TEXT,
        system_prompt TEXT,
        change_summary TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 108] Created persona_prompt_versions table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 108] persona_prompt_versions table already exists');
  }

  // Add indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_metrics_persona_date ON persona_metrics_snapshots(persona_id, snapshot_date)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_prompt_versions_persona ON persona_prompt_versions(persona_id, version_number)').run();
    logger.info('[Migration 108] Created observability indexes');
  } catch (e: any) {
    logger.info('[Migration 108] Indexes already exist or error: ' + e.message);
  }
}

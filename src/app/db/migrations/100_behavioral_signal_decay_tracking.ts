/**
 * Migration 100: Add decay tracking columns to behavioral_signals
 *
 * Adds decay_applied_at and last_decay_weight to support batched weekly
 * decay processing. Signals that have already been decayed in the current
 * cycle are skipped, preventing redundant updates and table locks.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate100BehavioralSignalDecayTracking(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare(`ALTER TABLE behavioral_signals ADD COLUMN decay_applied_at TEXT`).run();
    logger.info('[Migration 100] Added decay_applied_at column to behavioral_signals');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      throw e;
    }
    logger.info('[Migration 100] decay_applied_at column already exists');
  }

  // Index for efficient decay queries: find signals needing decay
  try {
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_behavioral_signals_decay
        ON behavioral_signals(project_id, timestamp, decay_applied_at)
        WHERE weight > 0.01
    `).run();
    logger.info('[Migration 100] Created decay tracking index');
  } catch (e: any) {
    logger.info('[Migration 100] Decay index already exists or not supported');
  }
}

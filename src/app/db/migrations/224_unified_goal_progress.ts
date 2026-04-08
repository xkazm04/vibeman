/**
 * Migration 224: Unified Goal Progress
 *
 * Reconciles the dual progress fields (progress + inferred_progress) into a
 * single authoritative progress model with source tracking and confidence.
 *
 * Adds:
 * - progress_source TEXT ('manual' | 'inferred' | 'hybrid')
 * - progress_confidence INTEGER (0-100)
 *
 * Reconciles existing data by taking the higher of progress/inferred_progress,
 * then deprecates inferred_progress (kept for backwards compat but no longer written).
 */

import type { MigrationLogger } from './migration.utils';

export function migrate224UnifiedGoalProgress(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  const columns = [
    { name: 'progress_source', sql: `ALTER TABLE goals ADD COLUMN progress_source TEXT DEFAULT 'manual'` },
    { name: 'progress_confidence', sql: `ALTER TABLE goals ADD COLUMN progress_confidence INTEGER DEFAULT 100` },
  ];

  for (const col of columns) {
    try {
      db.prepare(col.sql).run();
      logger.info(`[Migration 224] Added ${col.name} column to goals`);
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) throw e;
      logger.info(`[Migration 224] ${col.name} already exists`);
    }
  }

  // Reconcile: set progress = MAX(progress, inferred_progress) and track source
  try {
    db.exec(`
      UPDATE goals
      SET progress = MAX(COALESCE(progress, 0), COALESCE(inferred_progress, 0)),
          progress_source = CASE
            WHEN COALESCE(inferred_progress, 0) > COALESCE(progress, 0) THEN 'inferred'
            WHEN COALESCE(inferred_progress, 0) > 0 AND COALESCE(progress, 0) > 0 THEN 'hybrid'
            ELSE 'manual'
          END,
          progress_confidence = CASE
            WHEN COALESCE(inferred_progress, 0) > 0 AND COALESCE(progress, 0) > 0 THEN 90
            WHEN COALESCE(inferred_progress, 0) > 0 THEN 75
            ELSE 100
          END
      WHERE COALESCE(inferred_progress, 0) > 0 OR COALESCE(progress, 0) > 0
    `);
    logger.info('[Migration 224] Reconciled dual progress fields into unified model');
  } catch (e: any) {
    logger.info(`[Migration 224] Progress reconciliation skipped: ${e.message}`);
  }

  logger.info('[Migration 224] Unified goal progress migration complete');
}

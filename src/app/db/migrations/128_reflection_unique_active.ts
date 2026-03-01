/**
 * Migration 128: Add UNIQUE partial index for active reflections
 *
 * Prevents concurrent reflections per project by enforcing at the DB level
 * that only one non-terminal (pending or running) reflection can exist
 * per (project_id, scope) pair. Replaces the TOCTOU check-then-create
 * pattern in reflectionAgent.ts with an atomic INSERT that fails on
 * duplicate, eliminating the race window entirely.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate128ReflectionUniqueActive(
  db: { exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    // Partial unique index: only one pending/running reflection per project+scope
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_reflection_per_project
      ON brain_reflections(project_id, scope)
      WHERE status IN ('pending', 'running')
    `);

    logger.info('[Migration 128] Added UNIQUE partial index for active reflections on brain_reflections(project_id, scope)');
  } catch (e: any) {
    logger.info('[Migration 128] Active reflection unique index: ' + e.message);
  }
}

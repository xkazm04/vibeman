/**
 * Migration 133: Add query performance indexes for brain insights and directions
 *
 * - idx_bi_project_reflection: Compound index on brain_insights(project_id, reflection_id)
 *   for the effectiveness route JOIN between brain_insights and brain_reflections
 *   filtered by project_id.
 *
 * - idx_directions_project_status_created: Compound index on
 *   directions(project_id, status, created_at) for the windowed acceptance rate
 *   calculation in the effectiveness route which filters by project_id,
 *   status IN ('accepted', 'rejected'), and created_at >= date threshold.
 */

import { tableExists, type MigrationLogger } from './migration.utils';

export function migrate133BrainDirectionsQueryIndexes(
  db: { exec: (sql: string) => void; prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] } },
  logger: MigrationLogger
): void {
  // Compound index for brain_insights effectiveness JOIN
  if (tableExists(db as any, 'brain_insights')) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bi_project_reflection
      ON brain_insights(project_id, reflection_id)
    `);
  }

  // Compound index for directions windowed acceptance rate queries
  if (tableExists(db as any, 'directions')) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_directions_project_status_created
      ON directions(project_id, status, created_at)
    `);
  }

  logger.info('Migration 133: Added brain_insights and directions query performance indexes');
}

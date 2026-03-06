/**
 * Migration 137: Cascade Delete Evidence Junction on Source Removal
 *
 * Problem:
 * brain_insight_evidence has ON DELETE CASCADE for insight_id but no cascade
 * handling when evidence sources (directions, reflections, signals) are deleted.
 * Deleting a direction leaves orphaned junction rows where evidence_id points
 * to nothing, causing ghost references in getByEvidence() and countByEvidence().
 *
 * Solution:
 * Add DELETE triggers on directions, brain_reflections, and behavioral_signals
 * to automatically clean up brain_insight_evidence junction rows when evidence
 * sources are deleted.
 *
 * Triggers:
 *   - trigger_delete_direction_evidence → DELETE from junction where evidence_type='direction'
 *   - trigger_delete_reflection_evidence → DELETE from junction where evidence_type='reflection'
 *   - trigger_delete_signal_evidence → DELETE from junction where evidence_type='signal'
 */

import { safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';
import { getHotWritesDatabase } from '../hot-writes';

export function migrate137CascadeDeleteEvidenceJunction(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('cascadeDeleteEvidenceJunction', () => {
    // Check if triggers already exist (idempotent)
    const existingTriggers = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'trigger'
         AND name IN (
           'trigger_delete_direction_evidence',
           'trigger_delete_reflection_evidence',
           'trigger_delete_signal_evidence'
         )`
      )
      .all() as Array<{ name: string }>;

    if (existingTriggers.length === 3) {
      logger?.info?.('Evidence junction cascade triggers already exist');
      return;
    }

    // Drop existing triggers if they exist (in case of partial migration)
    db.exec(`
      DROP TRIGGER IF EXISTS trigger_delete_direction_evidence;
      DROP TRIGGER IF EXISTS trigger_delete_reflection_evidence;
      DROP TRIGGER IF EXISTS trigger_delete_signal_evidence;
    `);

    // Create triggers for cascade deletion
    db.exec(`
      -- Cascade delete evidence junction rows when direction is deleted
      CREATE TRIGGER trigger_delete_direction_evidence
      AFTER DELETE ON directions
      BEGIN
        DELETE FROM brain_insight_evidence
        WHERE evidence_type = 'direction' AND evidence_id = OLD.id;
      END;

      -- Cascade delete evidence junction rows when reflection is deleted
      CREATE TRIGGER trigger_delete_reflection_evidence
      AFTER DELETE ON brain_reflections
      BEGIN
        DELETE FROM brain_insight_evidence
        WHERE evidence_type = 'reflection' AND evidence_id = OLD.id;
      END;

      -- Cascade delete evidence junction rows when signal is deleted
      CREATE TRIGGER trigger_delete_signal_evidence
      AFTER DELETE ON behavioral_signals
      BEGIN
        DELETE FROM brain_insight_evidence
        WHERE evidence_type = 'signal' AND evidence_id = OLD.id;
      END;
    `);

    logger?.info?.('Created cascade delete triggers for evidence junction table');

    // Clean up any existing orphaned junction rows
    const orphanedCount = cleanupOrphanedEvidence(db, logger);
    if (orphanedCount > 0) {
      logger?.info?.(`Cleaned up ${orphanedCount} orphaned evidence junction rows`);
    }
  }, logger);
}

/**
 * Remove any existing orphaned junction rows where evidence_id
 * points to a deleted direction, reflection, or signal.
 *
 * Note: Signals live in hot-writes.db (separate SQLite file), so we must
 * query the hot-writes DB for signal existence checks. Directions and
 * reflections live in the main DB alongside the junction table.
 */
function cleanupOrphanedEvidence(db: DbConnection, logger?: MigrationLogger): number {
  let totalCleaned = 0;

  try {
    // Find orphaned direction references (same DB)
    const orphanedDirections = db
      .prepare(
        `DELETE FROM brain_insight_evidence
         WHERE evidence_type = 'direction'
         AND evidence_id NOT IN (SELECT id FROM directions)`
      )
      .run();
    totalCleaned += orphanedDirections.changes;

    // Find orphaned reflection references (same DB)
    const orphanedReflections = db
      .prepare(
        `DELETE FROM brain_insight_evidence
         WHERE evidence_type = 'reflection'
         AND evidence_id NOT IN (SELECT id FROM brain_reflections)`
      )
      .run();
    totalCleaned += orphanedReflections.changes;

    // Find orphaned signal references (cross-DB: signals live in hot-writes.db)
    try {
      const hotDb = getHotWritesDatabase();
      const signalEvidenceRows = db
        .prepare(
          `SELECT evidence_id FROM brain_insight_evidence WHERE evidence_type = 'signal'`
        )
        .all() as Array<{ evidence_id: string }>;

      if (signalEvidenceRows.length > 0) {
        const orphanedSignalIds: string[] = [];
        const existsStmt = hotDb.prepare(
          'SELECT 1 FROM behavioral_signals WHERE id = ? LIMIT 1'
        );
        for (const row of signalEvidenceRows) {
          if (!existsStmt.get(row.evidence_id)) {
            orphanedSignalIds.push(row.evidence_id);
          }
        }

        if (orphanedSignalIds.length > 0) {
          const placeholders = orphanedSignalIds.map(() => '?').join(',');
          const result = db
            .prepare(
              `DELETE FROM brain_insight_evidence
               WHERE evidence_type = 'signal' AND evidence_id IN (${placeholders})`
            )
            .run(...orphanedSignalIds);
          totalCleaned += result.changes;
        }
      }
    } catch (signalErr) {
      logger?.error?.(`Failed to clean up orphaned signal evidence: ${signalErr}`);
    }

    return totalCleaned;
  } catch (err) {
    logger?.error?.(`Failed to clean up orphaned evidence: ${err}`);
    return 0;
  }
}

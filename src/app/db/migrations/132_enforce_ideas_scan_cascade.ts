/**
 * Migration 132: Enforce ON DELETE CASCADE for ideas.scan_id
 *
 * The ideas table DDL already declares `FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE`,
 * but foreign_keys enforcement was only recently enabled. This migration:
 * 1. Deletes orphaned ideas whose scan_id no longer exists in the scans table
 * 2. Verifies the FK constraint is present with CASCADE action
 *
 * Going forward, the PRAGMA foreign_keys = ON (set in the driver) ensures
 * deleting a scan will automatically cascade-delete its ideas.
 */

import { getConnection } from '../drivers';
import { tableExists, type MigrationLogger } from './migration.utils';

export function migrate132EnforceIdeasScanCascade(db: ReturnType<typeof getConnection>, logger: MigrationLogger): void {
  if (!tableExists(db, 'ideas') || !tableExists(db, 'scans')) {
    logger.info('ideas or scans table does not exist, skipping cascade enforcement');
    return;
  }

  // Clean up orphaned ideas where scan_id references a non-existent scan
  const result = db.prepare(`
    DELETE FROM ideas
    WHERE scan_id NOT IN (SELECT id FROM scans)
  `).run();

  if (result.changes > 0) {
    logger.success(`Deleted ${result.changes} orphaned ideas with missing scan references`);
  }

  // Verify the FK constraint exists with CASCADE
  const fkList = db.pragma('foreign_key_list(ideas)') as unknown as Array<{
    id: number;
    seq: number;
    table: string;
    from: string;
    to: string;
    on_update: string;
    on_delete: string;
  }>;

  const scanFk = fkList.find(fk => fk.from === 'scan_id' && fk.table === 'scans');

  if (!scanFk) {
    logger.info('WARNING: ideas.scan_id FK to scans not found — table may need recreation');
  } else if (scanFk.on_delete !== 'CASCADE') {
    logger.info(`WARNING: ideas.scan_id FK has ON DELETE ${scanFk.on_delete} instead of CASCADE`);
  } else {
    logger.info('ideas.scan_id FK confirmed with ON DELETE CASCADE');
  }
}
